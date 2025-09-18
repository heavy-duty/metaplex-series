import {
  execute,
  findAssetSignerPda,
  updatePlugin,
} from "@metaplex-foundation/mpl-core";
import { transferSol } from "@metaplex-foundation/mpl-toolbox";
import {
  createNoopSigner,
  lamports,
  publicKey,
} from "@metaplex-foundation/umi";
import { base58 } from "@metaplex-foundation/umi/serializers";
import {
  calculatePaymentOrders,
  fetchAssetWithMetadata,
  getUmi,
  readKeypairFromFile,
  toCampaign,
} from "../utils";

export interface WithdrawCampaignCommandOptions {
  campaignAssetAddress: string;
  creatorKeypair: string;
  rpcUrl: string;
  serverKeypair: string;
  logLevel: string;
}

export async function withdrawCampaignCommand(
  options: WithdrawCampaignCommandOptions
) {
  // Initialize UMI
  const umi = await getUmi(options.serverKeypair);

  // Read the backer keypair
  const creatorKeypair = await readKeypairFromFile(umi, options.creatorKeypair);

  // Fetch the campaign asset with its metadata
  const campaignAssetWithMetadata = await fetchAssetWithMetadata({
    serverKeypair: options.serverKeypair,
    campaignAssetAddress: options.campaignAssetAddress,
  });

  // Transform asset with metadata into campaign
  const campaign = toCampaign(campaignAssetWithMetadata);

  // TODO: assert the creator matches the campaign's creator

  // Get the campaign payment orders
  const paymentOrders = calculatePaymentOrders(
    campaign.durationMonths,
    campaign.goal,
    campaign.projectStartDate
  );

  // Calculate the monthly payout amount
  const monthlyPayout = campaign.goal / campaign.durationMonths;

  // Filter unclaimed payment orders that are due
  const currentDate = new Date();
  const dueUnclaimedOrders = paymentOrders.filter(
    (order) =>
      order.status === "unclaimed" &&
      new Date(order.dueTimestamp) <= currentDate
  );

  // Create a noop signer for the campaign asset's signer PDA
  const campaignAssetSignerPda = findAssetSignerPda(umi, {
    asset: publicKey(campaign.address),
  });
  const campaignAssetSigner = createNoopSigner(campaignAssetSignerPda[0]);

  // Transfer funds for each order and mark it as claimed
  for (const order of dueUnclaimedOrders) {
    // Calculate the amount to transfer (max between monthly payout and currently deposited)
    const transferAmount = Math.max(monthlyPayout, campaign.currentlyDeposited);

    // Transfer SOL from campaign asset signer to creator
    const transferSolTransactionBuilder = transferSol(umi, {
      amount: lamports(transferAmount),
      source: campaignAssetSigner,
      destination: creatorKeypair.publicKey,
    });

    const transferSolSignature = await execute(umi, {
      asset: campaignAssetWithMetadata,
      instructions: transferSolTransactionBuilder.getInstructions(),
      payer: umi.identity,
      assetSigner: campaignAssetSignerPda,
    }).sendAndConfirm(umi);
    console.log(
      `Transfer SOL for payment order ${order.monthIndex + 1} signature: ${
        base58.deserialize(transferSolSignature.signature)[0]
      }`
    );

    // Update campaign attributes
    const updateCampaignSignature = await updatePlugin(umi, {
      asset: publicKey(options.campaignAssetAddress),
      plugin: {
        type: "Attributes",
        attributeList: [
          // TODO: if the last payment order is done, mark as done, if there are pending payment orders and there is no funds, mark as stall.
          { key: "status", value: "active" },
          {
            key: "pledgesCollectionAddress",
            value: campaign.pledgesCollectionAddress
              ? publicKey(campaign.pledgesCollectionAddress)
              : "",
          },
          { key: "totalPledges", value: campaign.totalPledges.toString() },
          {
            key: "refundedPledges",
            value: campaign.refundedPledges.toString(),
          },
          {
            key: "totalDeposited",
            value: campaign.totalDeposited.toString(),
          },
          {
            key: "currentlyDeposited",
            value: (campaign.currentlyDeposited - transferAmount).toString(),
          },
          ...paymentOrders.map((paymentOrder, index) => ({
            key: `paymentOrder_${index + 1}`,
            value: order.monthIndex === index ? "claimed" : paymentOrder.status,
          })),
        ],
      },
    }).sendAndConfirm(umi);

    console.log(
      `Updated campaign for payment order #${
        order.monthIndex + 1
      }, new currentlyDeposited: ${
        campaign.currentlyDeposited - transferAmount
      } signature: ${base58.deserialize(updateCampaignSignature.signature)[0]}`
    );
  }
}
