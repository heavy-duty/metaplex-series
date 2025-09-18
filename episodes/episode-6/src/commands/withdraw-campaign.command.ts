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

  // Assert the creator matches the campaign's creator
  if (campaign.creatorWallet !== creatorKeypair.publicKey) {
    throw new Error("You are not authorized to withdraw from this campaign");
  }

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
    if (campaign.currentlyDeposited < monthlyPayout) {
      throw new Error(
        "There are not enough funds to claim this payment order."
      );
    }

    // Transfer SOL from campaign asset signer to creator
    const transferSolTransactionBuilder = transferSol(umi, {
      amount: lamports(monthlyPayout),
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
            value: (campaign.currentlyDeposited - monthlyPayout).toString(),
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
        campaign.currentlyDeposited - monthlyPayout
      } signature: ${base58.deserialize(updateCampaignSignature.signature)[0]}`
    );
  }
}
