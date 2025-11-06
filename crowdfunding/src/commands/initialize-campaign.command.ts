import {
  createCollectionV1,
  updatePlugin,
} from "@metaplex-foundation/mpl-core";
import { generateSigner, publicKey } from "@metaplex-foundation/umi";
import { base58 } from "@metaplex-foundation/umi/serializers";
import path from "path";
import {
  fetchAssetWithMetadata,
  getUmi,
  readKeypairFromFile,
  toCampaign,
  uploadImage,
} from "../utils";

export interface InitializeCampaignCommandOptions {
  campaignAssetAddress: string;
  creatorKeypair: string;
  rpcUrl: string;
  serverKeypair: string;
  logLevel: string;
}

export async function initializeCampaignCommand(
  options: InitializeCampaignCommandOptions,
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

  if (campaign.status !== "draft") {
    throw new Error("Initialize is only allowed for draft campaigns");
  }

  if (campaign.creatorWallet !== creatorKeypair.publicKey) {
    throw new Error("You are not authorized to initialize this campaign");
  }

  // Upload metadata and create pledges collection
  const pledgesCollectionImage = await uploadImage(
    umi,
    path.join(__dirname, "../../assets", "pledges-collection-image.png"),
  );
  const pledgesCollectionUri = await umi.uploader.uploadJson({
    name: "Pledges Collection",
    symbol: "PLEDGE",
    description: "A collection of pledges for a campaign",
    image: pledgesCollectionImage,
  });
  const pledgesCollectionSigner = generateSigner(umi);
  const createCollectionSignature = await createCollectionV1(umi, {
    collection: pledgesCollectionSigner,
    name: "Pledges Collection",
    uri: pledgesCollectionUri,
  }).sendAndConfirm(umi);
  console.log(
    `Create Pledges Collection (address: ${pledgesCollectionSigner.publicKey}) signature: ${
      base58.deserialize(createCollectionSignature.signature)[0]
    }`,
  );

  // Update campaign attributes (status and campaign asset address)
  const updateCampaignSignature = await updatePlugin(umi, {
    asset: publicKey(options.campaignAssetAddress),
    plugin: {
      type: "Attributes",
      attributeList: [
        { key: "status", value: "active" },
        {
          key: "pledgesCollectionAddress",
          value: pledgesCollectionSigner.publicKey,
        },
        { key: "totalPledges", value: "0" },
        { key: "refundedPledges", value: "0" },
        { key: "totalDeposited", value: "0" },
        { key: "currentlyDeposited", value: "0" },
        ...campaign.paymentOrders.map((paymentOrder) => ({
          key: `paymentOrder_${paymentOrder.orderNumber}`,
          value: paymentOrder.status,
        })),
      ],
    },
  }).sendAndConfirm(umi);
  console.log(
    `Update campaign (address: ${campaign.address}) signature: ${
      base58.deserialize(updateCampaignSignature.signature)[0]
    }`,
  );
}
