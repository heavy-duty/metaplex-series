import {
  create as createCoreNft,
  fetchCollection,
  findAssetSignerPda,
  updatePlugin,
} from "@metaplex-foundation/mpl-core";
import { transferSol } from "@metaplex-foundation/mpl-toolbox";
import {
  createGenericFile,
  createSignerFromKeypair,
  generateSigner,
  lamports,
  publicKey,
} from "@metaplex-foundation/umi";
import { base58 } from "@metaplex-foundation/umi/serializers";
import { readFile } from "fs/promises";
import path from "path";
import {
  fetchAssetWithMetadata,
  getUmi,
  readKeypairFromFile,
  toCampaign,
} from "../utils";

export interface PledgeCampaignCommandOptions {
  campaignAssetAddress: string;
  backerKeypair: string;
  rpcUrl: string;
  serverKeypair: string;
  logLevel: string;
}

export async function pledgeCampaignCommand(
  options: PledgeCampaignCommandOptions
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

  const transferSolSignature = await transferSol(umi, {
    amount: lamports(currentPledgePrice),
    destination: findAssetSignerPda(umi, {
      asset: publicKey(campaign.address),
    }),
    source: createSignerFromKeypair(umi, backerKeypair),
  }).sendAndConfirm(umi);
  console.log(
    `Transfer SOL signature: ${
      base58.deserialize(transferSolSignature.signature)[0]
    }`
  );

  // Upload pledge image
  const pledgeImagePath = path.join(
    __dirname,
    "../../assets",
    "pledge-image.png"
  );
  const pledgeImageBuffer = await readFile(pledgeImagePath);
  const pledgeImageFile = createGenericFile(
    pledgeImageBuffer,
    pledgeImagePath,
    {
      contentType: "image/png",
    }
  );
  const [pledgeImage] = await umi.uploader.upload([pledgeImageFile]);

  // Upload pledge metadata
  const pledgeUri = await umi.uploader.uploadJson({
    name: `Pledge #${campaign.totalPledges}`,
    symbol: "PLEDGE",
    description: `This NFT represents a pledge to the campaign with address: ${campaign.address}`,
    image: pledgeImage,
  });

  // Send transaction to mint the pledge NFT
  const collection = await fetchCollection(
    umi,
    publicKey(campaign.pledgesCollectionAddress)
  );
  const pledgeSigner = generateSigner(umi);
  const createPledgeSignature = await createCoreNft(umi, {
    asset: pledgeSigner,
    name: `Pledge #${campaign.totalPledges}`,
    uri: pledgeUri,
    collection,
    owner: backerKeypair.publicKey,
  }).sendAndConfirm(umi);
  console.log(
    `Create Pledge (address: ${pledgeSigner.publicKey}) signature: ${
      base58.deserialize(createPledgeSignature.signature)[0]
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
    `Update Campaign signature: ${
      base58.deserialize(updateCampaignSignature.signature)[0]
    }`
  );
}
