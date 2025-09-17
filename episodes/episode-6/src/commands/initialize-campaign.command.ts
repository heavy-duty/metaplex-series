import {
  createCollectionV1,
  updatePlugin,
} from "@metaplex-foundation/mpl-core";
import {
  addConfigLines,
  create as createCandyMachine,
} from "@metaplex-foundation/mpl-core-candy-machine";
import {
  createGenericFile,
  generateSigner,
  publicKey,
  some,
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
  options: InitializeCampaignCommandOptions
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
  const pledgesAvailable = Math.floor(campaign.goal / campaign.baseUnit);

  // Upload pledge collection image
  const collectionImagePath = path.join(
    __dirname,
    "../../assets",
    "pledges-collection-image.png"
  );
  const collectionImageBuffer = await readFile(collectionImagePath);
  const collectionImageFile = createGenericFile(
    collectionImageBuffer,
    collectionImagePath,
    {
      contentType: "image/png",
    }
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
    name: options.name,
    symbol: options.symbol,
    description: options.description,
    image: pledgeImage,
  });

  // Create pledge candy machine
  const candyMachineSigner = generateSigner(umi);
  const candyMachineConfigLineSettings = some({
    prefixName: "Pledge #$ID+1$",
    nameLength: 0,
    prefixUri: "https://gateway.irys.xyz/",
    uriLength: 70,
    isSequential: false,
  });
  const candyMachineGuards = {
    thirdPartySigner: some({ signerKey: umi.identity.publicKey }),
  };

  const createCandyMachineTransaction = await createCandyMachine(umi, {
    candyMachine: candyMachineSigner,
    collection: collectionMintSigner.publicKey,
    collectionUpdateAuthority: umi.identity,
    itemsAvailable: pledgesAvailable,
    configLineSettings: candyMachineConfigLineSettings,
    guards: candyMachineGuards,
  });
  const createCandyMachineSignature =
    await createCandyMachineTransaction.sendAndConfirm(umi);
  console.log(
    `Create Core Candy Machine signature: ${
      base58.deserialize(createCandyMachineSignature.signature)[0]
    }`
  );

  // Add the items to the candy machine
  const BATCH_SIZE = 10;
  let index = 0;
  while (index < pledgesAvailable) {
    const batchSize = Math.min(BATCH_SIZE, pledgesAvailable - index);
    const batch = Array(batchSize).fill({ name: "", uri: pledgeUri });
    const addConfigLinesSignature = await addConfigLines(umi, {
      candyMachine: candyMachineSigner.publicKey,
      index,
      configLines: batch,
    }).sendAndConfirm(umi);
    console.log(
      `Add Config Lines batch starting at ${index} signature: ${
        base58.deserialize(addConfigLinesSignature.signature)[0]
      }`
    );
    index += batchSize;
  }

  // Update campaign attributes (status and campaign asset address)
  await updatePlugin(umi, {
    asset: publicKey(options.campaignAssetAddress),
    plugin: {
      type: "Attributes",
      attributeList: [
        { key: "status", value: "active" },
        {
          key: "pledgesCandyMachineAddress",
          value: candyMachineSigner.publicKey,
        },
        { key: "totalPledges", value: "0" },
        { key: "refundedPledges", value: "0" },
        ...campaign.paymentOrders.map((paymentOrder) => ({
          key: `paymentOrder_${paymentOrder.orderNumber}`,
          value: paymentOrder.status,
        })),
      ],
    },
  }).sendAndConfirm(umi);
}
