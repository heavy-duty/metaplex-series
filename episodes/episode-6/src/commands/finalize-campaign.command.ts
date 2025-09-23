import {
  createCollectionV1,
  updatePlugin,
} from "@metaplex-foundation/mpl-core";
import {
  addConfigLines,
  create as createCandyMachine,
} from "@metaplex-foundation/mpl-core-candy-machine";
import { generateSigner, publicKey, some } from "@metaplex-foundation/umi";
import { base58 } from "@metaplex-foundation/umi/serializers";
import path from "path";
import {
  fetchAssetWithMetadata,
  getUmi,
  readKeypairFromFile,
  toCampaign,
  uploadImage,
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

  // Create the rewards collection
  const rewardCollectionImage = await uploadImage(
    umi,
    path.join(__dirname, "../../assets", "rewards-collection-image.png"),
  );
  const rewardCollectionUri = await umi.uploader.uploadJson({
    name: "Rewards Collection",
    symbol: "REWARD",
    description: "A collection of rewards for a campaign",
    image: rewardCollectionImage,
  });
  const rewardsCollectionSigner = generateSigner(umi);
  const createRewardsCollectionSignature = await createCollectionV1(umi, {
    collection: rewardsCollectionSigner,
    name: "Rewards Collection",
    uri: rewardCollectionUri,
  }).sendAndConfirm(umi);
  console.log(
    `Create Rewards Collection (address: ${rewardsCollectionSigner.publicKey}) signature: ${
      base58.deserialize(createRewardsCollectionSignature.signature)[0]
    }`,
  );

  // Create the rewards candy machine
  const rewardsCandyMachineSigner = generateSigner(umi);
  const rewardsAvailable = campaign.totalPledges - campaign.refundedPledges;
  const createRewardsCandyMachineTransaction = await createCandyMachine(umi, {
    candyMachine: rewardsCandyMachineSigner,
    collection: rewardsCollectionSigner.publicKey,
    collectionUpdateAuthority: umi.identity,
    itemsAvailable: rewardsAvailable,
    configLineSettings: some({
      prefixName: "Reward #$ID+1$",
      nameLength: 0,
      prefixUri: "https://gateway.irys.xyz/",
      uriLength: 44,
      isSequential: false,
    }),
    guards: {
      assetBurn: some({
        requiredCollection: publicKey(campaign.pledgesCollectionAddress),
      }),
    },
  });
  const createRewardsCandyMachineSignature =
    await createRewardsCandyMachineTransaction.sendAndConfirm(umi);
  console.log(
    `Create Core Candy Machine (address: ${rewardsCandyMachineSigner.publicKey}) signature: ${
      base58.deserialize(createRewardsCandyMachineSignature.signature)[0]
    }`,
  );

  // Add rewards to the candy machine (use generic reward for now)
  const rewardImage = await uploadImage(
    umi,
    path.join(__dirname, "../../assets", "reward-image.png"),
  );
  const rewardUri = await umi.uploader.uploadJson({
    name: "Reward",
    symbol: "REWARD",
    description: "A reward from a successful campaign.",
    image: rewardImage,
  });
  const rewardUriSegments = rewardUri.split("/");
  const rewardAssetHash = rewardUriSegments[rewardUriSegments.length - 1];
  const BATCH_SIZE = 10;
  let index = 0;

  while (index < rewardsAvailable) {
    const batch = Array(Math.min(BATCH_SIZE, rewardsAvailable - index)).fill({
      name: "",
      uri: rewardAssetHash,
    });

    const addConfigLinesSignature = await addConfigLines(umi, {
      candyMachine: rewardsCandyMachineSigner.publicKey,
      index: index,
      configLines: batch,
    }).sendAndConfirm(umi);

    console.log(
      `Add Config Lines batch ${Math.floor(index / BATCH_SIZE) + 1}/${Math.ceil(rewardsAvailable / BATCH_SIZE)} signature: ${
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
        {
          key: "rewardsCollectionAddress",
          value: rewardsCollectionSigner.publicKey,
        },
        {
          key: "rewardsCandyMachineAddress",
          value: rewardsCandyMachineSigner.publicKey,
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
