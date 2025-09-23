import {
  createCollectionV1,
  updatePlugin,
} from "@metaplex-foundation/mpl-core";
import {
  createGenericFile,
  generateSigner,
  publicKey,
} from "@metaplex-foundation/umi";
import { base58 } from "@metaplex-foundation/umi/serializers";
import { readFile } from "fs/promises";
import path from "path";
import { fetchAssetWithMetadata, getUmi, toCampaign } from "../utils";

export interface InitializeCampaignCommandOptions {
  campaignAssetAddress: string;
  name: string;
  description: string;
  symbol: string;
  rpcUrl: string;
  serverKeypair: string;
  logLevel: string;
}

export async function initializeCampaignCommand(
  options: InitializeCampaignCommandOptions,
) {
  // Initialize UMI
  const umi = await getUmi(options.serverKeypair);

  // Fetch the campaign asset with its metadata
  const campaignAssetWithMetadata = await fetchAssetWithMetadata({
    serverKeypair: options.serverKeypair,
    campaignAssetAddress: options.campaignAssetAddress,
  });

  // Transform asset with metadata into campaign
  const campaign = toCampaign(campaignAssetWithMetadata);

  // Upload pledge collection image
  const collectionImagePath = path.join(
    __dirname,
    "../../assets",
    "pledges-collection-image.png",
  );
  const collectionImageBuffer = await readFile(collectionImagePath);
  const collectionImageFile = createGenericFile(
    collectionImageBuffer,
    collectionImagePath,
    {
      contentType: "image/png",
    },
  );
  const [collectionImage] = await umi.uploader.upload([collectionImageFile]);

  // Upload pledge collection metadata
  const collectionUri = await umi.uploader.uploadJson({
    name: "Pledges Collection",
    symbol: "PLEDGE",
    description: "A collection of pledges for a campaign",
    image: collectionImage,
  });

  const collectionMintSigner = generateSigner(umi);
  const createCollectionSignature = await createCollectionV1(umi, {
    collection: collectionMintSigner,
    name: "Pledges Collection",
    uri: collectionUri,
  }).sendAndConfirm(umi);
  console.log(
    `Create Pledges Collection signature: ${
      base58.deserialize(createCollectionSignature.signature)[0]
    }`,
  );

  // Update campaign attributes (status and campaign asset address)
  await updatePlugin(umi, {
    asset: publicKey(options.campaignAssetAddress),
    plugin: {
      type: "Attributes",
      attributeList: [
        { key: "status", value: "active" },
        {
          key: "pledgesCollectionAddress",
          value: collectionMintSigner.publicKey,
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
}
