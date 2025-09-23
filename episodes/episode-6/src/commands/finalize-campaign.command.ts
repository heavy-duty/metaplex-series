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
import {
  fetchAssetWithMetadata,
  getUmi,
  readKeypairFromFile,
  toCampaign,
} from "../utils";

export interface FinalizeCampaignCommandOptions {
  campaignAssetAddress: string;
  creatorKeypair: string;
  rpcUrl: string;
  serverKeypair: string;
  logLevel: string;
}

export async function finalizeCampaignCommand(
  options: FinalizeCampaignCommandOptions,
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

  // Validate campaign
  if (!campaign.pledgesCollectionAddress) {
    throw new Error("Pledges collection address not defined");
  }

  if (campaign.creatorWallet !== creatorKeypair.publicKey) {
    throw new Error("Not authorized to finalize this campaign");
  }

  // Upload reward collection image
  const collectionImagePath = path.join(
    __dirname,
    "../../assets",
    "rewards-collection-image.png",
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

  // Upload reward collection metadata
  const collectionUri = await umi.uploader.uploadJson({
    name: "Rewards Collection",
    symbol: "REWARD",
    description: "A collection of rewards for a campaign",
    image: collectionImage,
  });

  const collectionMintSigner = generateSigner(umi);
  const createCollectionSignature = await createCollectionV1(umi, {
    collection: collectionMintSigner,
    name: "Rewards Collection",
    uri: collectionUri,
  }).sendAndConfirm(umi);
  console.log(
    `Create Rewards Collection signature: ${
      base58.deserialize(createCollectionSignature.signature)[0]
    }`,
  );

  // Create the rewards candy machine
  const candyMachineSigner = generateSigner(umi);
  const candyMachineConfigLineSettings = some({
    prefixName: "Reward #$ID+1$",
    nameLength: 0,
    prefixUri: "https://gateway.irys.xyz/",
    uriLength: 44,
    isSequential: false,
  });
  const candyMachineGuards = {
    assetBurn: some({
      requiredCollection: publicKey(campaign.pledgesCollectionAddress),
    }),
  };

  const rewardsAvailable = campaign.totalPledges - campaign.refundedPledges;
  const createCandyMachineTransaction = await createCandyMachine(umi, {
    candyMachine: candyMachineSigner,
    collection: collectionMintSigner.publicKey,
    collectionUpdateAuthority: umi.identity,
    itemsAvailable: rewardsAvailable,
    configLineSettings: candyMachineConfigLineSettings,
    guards: candyMachineGuards,
  });
  const createCandyMachineSignature =
    await createCandyMachineTransaction.sendAndConfirm(umi);
  console.log(
    `Create Core Candy Machine signature: ${
      base58.deserialize(createCandyMachineSignature.signature)[0]
    }`,
  );

  // Add all the items to the candy machine (use generic reward for now)
  const rewardImagePath = path.join(__dirname, "../assets", "reward-image.png");
  const rewardImageBuffer = await readFile(rewardImagePath);
  const rewardImageFile = createGenericFile(
    rewardImageBuffer,
    rewardImagePath,
    {
      contentType: "image/png",
    },
  );
  const [rewardImage] = await umi.uploader.upload([rewardImageFile]);
  const rewardUri = await umi.uploader.uploadJson({
    name: "Reward",
    symbol: "REWARD",
    description: "A reward from a successful campaign.",
    image: rewardImage,
  });
  const rewardUriSegments = rewardUri.split("/");
  const rewardAssetHash = rewardUriSegments[rewardUriSegments.length - 1];
  const candyMachineConfigLines = new Array(rewardsAvailable).fill({
    name: "",
    uri: rewardAssetHash,
  });

  const BATCH_SIZE = 10;
  let index = 0;
  while (index < candyMachineConfigLines.length) {
    const batch = candyMachineConfigLines.slice(index, index + BATCH_SIZE);
    const addConfigLinesSignature = await addConfigLines(umi, {
      candyMachine: candyMachineSigner.publicKey,
      index: index,
      configLines: batch,
    }).sendAndConfirm(umi);
    console.log(
      `Add Config Lines batch ${Math.floor(index / BATCH_SIZE) + 1}/${Math.ceil(candyMachineConfigLines.length / BATCH_SIZE)} signature: ${
        base58.deserialize(addConfigLinesSignature.signature)[0]
      }`,
    );
    index += BATCH_SIZE;
  }

  // Update the candy machine to mark it as finalized.
  const updateCampaignSignature = await updatePlugin(umi, {
    asset: publicKey(options.campaignAssetAddress),
    plugin: {
      type: "Attributes",
      attributeList: [
        { key: "status", value: "finalized" },
        {
          key: "pledgesCollectionAddress",
          value: publicKey(campaign.pledgesCollectionAddress),
        },
        { key: "totalPledges", value: campaign.totalPledges.toString() },
        { key: "refundedPledges", value: campaign.refundedPledges.toString() },
        {
          key: "totalDeposited",
          value: campaign.totalDeposited.toString(),
        },
        {
          key: "currentlyDeposited",
          value: campaign.currentlyDeposited.toString(),
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
    }`,
  );
}
