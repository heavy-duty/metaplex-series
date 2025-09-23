import {
  create as createCoreNft,
  fetchCollection,
  findAssetSignerPda,
  updatePlugin,
} from "@metaplex-foundation/mpl-core";
import { transferSol } from "@metaplex-foundation/mpl-toolbox";
import {
  createSignerFromKeypair,
  generateSigner,
  lamports,
  publicKey,
} from "@metaplex-foundation/umi";
import { base58 } from "@metaplex-foundation/umi/serializers";
import path from "path";
import {
  fetchAssetWithMetadata,
  getUmi,
  readKeypairFromFile,
  toCampaign,
  uploadImage,
} from "../utils";

export interface PledgeCampaignCommandOptions {
  campaignAssetAddress: string;
  backerKeypair: string;
  rpcUrl: string;
  serverKeypair: string;
  logLevel: string;
}

export async function pledgeCampaignCommand(
  options: PledgeCampaignCommandOptions,
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

  // Calculate the cost of the current pledge and transfer pledge cost in SOL to the campaign asset signer
  const netPledgeSupply = campaign.totalPledges - campaign.refundedPledges;
  const currentPledgePrice =
    campaign.basePrice + netPledgeSupply * campaign.bondingSlope;

  const campaignAssetSigner = findAssetSignerPda(umi, {
    asset: publicKey(campaign.address),
  });
  const transferAmount = lamports(currentPledgePrice);
  const transferSolSignature = await transferSol(umi, {
    amount: transferAmount,
    destination: campaignAssetSigner,
    source: createSignerFromKeypair(umi, backerKeypair),
  }).sendAndConfirm(umi);
  console.log(
    `Transfer ${Number(transferAmount.basisPoints) / Math.pow(10, transferAmount.decimals)} SOL (to address: ${campaignAssetSigner[0]}) signature: ${
      base58.deserialize(transferSolSignature.signature)[0]
    }`,
  );

  // Upload metadata and create pledge
  const pledgeImage = await uploadImage(
    umi,
    path.join(__dirname, "../../assets", "pledge-image.png"),
  );
  const pledgeUri = await umi.uploader.uploadJson({
    name: `Pledge #${campaign.totalPledges}`,
    symbol: "PLEDGE",
    description: `This NFT represents a pledge to the campaign with address: ${campaign.address}`,
    image: pledgeImage,
  });
  const pledgesCollection = await fetchCollection(
    umi,
    publicKey(campaign.pledgesCollectionAddress),
  );
  const pledgeSigner = generateSigner(umi);
  const createPledgeSignature = await createCoreNft(umi, {
    asset: pledgeSigner,
    name: `Pledge #${campaign.totalPledges}`,
    uri: pledgeUri,
    collection: pledgesCollection,
    owner: backerKeypair.publicKey,
  }).sendAndConfirm(umi);
  console.log(
    `Create Pledge (address: ${pledgeSigner.publicKey}) signature: ${
      base58.deserialize(createPledgeSignature.signature)[0]
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
        { key: "totalPledges", value: (campaign.totalPledges + 1).toString() },
        { key: "refundedPledges", value: campaign.refundedPledges.toString() },
        {
          key: "totalDeposited",
          value: (campaign.totalDeposited + currentPledgePrice).toString(),
        },
        {
          key: "currentlyDeposited",
          value: (campaign.currentlyDeposited + currentPledgePrice).toString(),
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
