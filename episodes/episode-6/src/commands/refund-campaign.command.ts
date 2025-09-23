import {
  burn,
  execute,
  fetchAssetV1,
  fetchCollection,
  findAssetSignerPda,
  updatePlugin,
} from "@metaplex-foundation/mpl-core";
import { transferSol } from "@metaplex-foundation/mpl-toolbox";
import {
  createNoopSigner,
  createSignerFromKeypair,
  lamports,
  publicKey,
} from "@metaplex-foundation/umi";
import { base58 } from "@metaplex-foundation/umi/serializers";
import {
  fetchAssetWithMetadata,
  getUmi,
  readKeypairFromFile,
  toCampaign,
} from "../utils";

export interface RefundCampaignCommandOptions {
  campaignAssetAddress: string;
  pledgeAssetAddress: string;
  backerKeypair: string;
  rpcUrl: string;
  serverKeypair: string;
  logLevel: string;
}

export async function refundCampaignCommand(
  options: RefundCampaignCommandOptions,
) {
  // Initialize UMI
  const umi = await getUmi(options.serverKeypair);

  // Read the backer keypair
  const backerKeypair = await readKeypairFromFile(umi, options.backerKeypair);

  // Fetch the campaign asset with its metadata
  const campaignAssetWithMetadata = await fetchAssetWithMetadata({
    serverKeypair: options.serverKeypair,
    campaignAssetAddress: options.campaignAssetAddress,
  });

  // Transform asset with metadata into campaign
  const campaign = toCampaign(campaignAssetWithMetadata);

  if (!campaign.pledgesCollectionAddress) {
    throw new Error("Pledges collection address is missing.");
  }

  // Fetch pledge asset and validate owner
  const pledgeAsset = await fetchAssetV1(
    umi,
    publicKey(options.pledgeAssetAddress),
  );

  if (pledgeAsset.owner !== backerKeypair.publicKey) {
    throw new Error("You are not authorized to refund with this pledge");
  }

  // Handle refund transfer
  const netPledgeSupply = campaign.totalPledges - campaign.refundedPledges;
  const currentPledgePrice =
    campaign.basePrice + (netPledgeSupply - 1) * campaign.bondingSlope;
  const refundAmount = lamports(currentPledgePrice);
  const campaignAssetSignerPda = findAssetSignerPda(umi, {
    asset: publicKey(campaign.address),
  });
  const campaignAssetSigner = createNoopSigner(campaignAssetSignerPda[0]);
  const transferSolSignature = await execute(umi, {
    asset: campaignAssetWithMetadata,
    instructions: transferSol(umi, {
      amount: refundAmount,
      source: campaignAssetSigner,
      destination: backerKeypair.publicKey,
    }).getInstructions(),
    payer: umi.identity,
    assetSigner: campaignAssetSignerPda,
  }).sendAndConfirm(umi);
  console.log(
    `Transfer ${Number(refundAmount.basisPoints) / Math.pow(10, refundAmount.decimals)} SOL (to address: ${backerKeypair.publicKey}) signature: ${
      base58.deserialize(transferSolSignature.signature)[0]
    }`,
  );

  // Burn the pledge NFT
  const pledgesCollection = await fetchCollection(
    umi,
    publicKey(campaign.pledgesCollectionAddress),
  );
  const burnPledgeSignature = await burn(umi, {
    asset: pledgeAsset,
    collection: pledgesCollection,
    authority: createSignerFromKeypair(umi, backerKeypair),
  }).sendAndConfirm(umi);
  console.log(
    `Burn Pledge (address: ${options.pledgeAssetAddress}) signature: ${
      base58.deserialize(burnPledgeSignature.signature)[0]
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
          value: publicKey(campaign.pledgesCollectionAddress),
        },
        { key: "totalPledges", value: campaign.totalPledges.toString() },
        {
          key: "refundedPledges",
          value: (campaign.refundedPledges + 1).toString(),
        },
        {
          key: "totalDeposited",
          value: campaign.totalDeposited.toString(),
        },
        {
          key: "currentlyDeposited",
          value: (campaign.currentlyDeposited - currentPledgePrice).toString(),
        },
        ...campaign.paymentOrders.map((paymentOrder) => ({
          key: `paymentOrder_${paymentOrder.orderNumber}`,
          value: paymentOrder.status,
        })),
      ],
    },
  }).sendAndConfirm(umi);
  console.log(
    `Update Campaign (address: ${campaign.address}) signature: ${
      base58.deserialize(updateCampaignSignature.signature)[0]
    }`,
  );
}
