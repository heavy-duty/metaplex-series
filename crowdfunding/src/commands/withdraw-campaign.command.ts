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
  orderNumber: string;
  creatorKeypair: string;
  rpcUrl: string;
  serverKeypair: string;
  logLevel: string;
}

export async function withdrawCampaignCommand(
  options: WithdrawCampaignCommandOptions,
) {
  // Initialize UMI
  const umi = await getUmi(options.serverKeypair);

  // Read the creator keypair
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

  if (campaign.status === "draft") {
    throw new Error("Withdraw is not allowed for draft campaigns");
  }

  // Get the campaign payment orders
  const paymentOrders = calculatePaymentOrders(
    campaign.durationMonths,
    campaign.goal,
    campaign.projectStartDate,
    campaign.paymentOrders,
  );

  // Calculate the monthly payout amount
  const monthlyPayout = campaign.goal / campaign.durationMonths;

  // Filter unclaimed payment orders that are due
  const orderNumber = parseInt(options.orderNumber, 10);
  const order = paymentOrders.find(
    (order) => order.orderNumber === orderNumber,
  );

  if (!order) {
    throw new Error("Order not found");
  }

  const currentDate = new Date();

  if (order.status === "claimed") {
    throw new Error("Order already claimed");
  }

  if (new Date(order.dueTimestamp) > currentDate) {
    throw new Error("Order cannot be claimed yet");
  }

  // Create a noop signer for the campaign asset's signer PDA
  const campaignAssetSignerPda = findAssetSignerPda(umi, {
    asset: publicKey(campaign.address),
  });
  const campaignAssetSigner = createNoopSigner(campaignAssetSignerPda[0]);

  if (campaign.currentlyDeposited < monthlyPayout) {
    throw new Error("There are not enough funds to claim this payment order.");
  }

  // Transfer SOL from campaign asset signer to creator
  const transferAmount = lamports(monthlyPayout);
  const transferSolSignature = await execute(umi, {
    asset: campaignAssetWithMetadata,
    instructions: transferSol(umi, {
      amount: transferAmount,
      source: campaignAssetSigner,
      destination: creatorKeypair.publicKey,
    }).getInstructions(),
    payer: umi.identity,
    assetSigner: campaignAssetSignerPda,
  }).sendAndConfirm(umi);
  console.log(
    `Transfer ${Number(transferAmount.basisPoints) / Math.pow(10, transferAmount.decimals)} SOL (to address: ${creatorKeypair.publicKey}) signature: ${
      base58.deserialize(transferSolSignature.signature)[0]
    }`,
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
        ...paymentOrders.map((paymentOrder) => ({
          key: `paymentOrder_${paymentOrder.orderNumber}`,
          value:
            paymentOrder.orderNumber === orderNumber
              ? "claimed"
              : paymentOrder.status,
        })),
      ],
    },
  }).sendAndConfirm(umi);

  console.log(
    `Updated campaign (address: ${campaign.address}) signature: ${base58.deserialize(updateCampaignSignature.signature)[0]}`,
  );
}
