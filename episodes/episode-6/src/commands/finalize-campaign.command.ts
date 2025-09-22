import { create as createCoreNft } from "@metaplex-foundation/mpl-core";
import { createGenericFile, generateSigner } from "@metaplex-foundation/umi";
import { base58 } from "@metaplex-foundation/umi/serializers";
import { getUnixTime, parseISO } from "date-fns";
import { readFile } from "fs/promises";
import path from "path";
import { calculatePaymentOrders, getUmi, readKeypairFromFile } from "../utils";

export interface FinalizeCampaignCommandOptions {
  campaignAssetAddress: string;
  creatorKeypair: string;
  rpcUrl: string;
  serverKeypair: string;
  logLevel: string;
}

export async function finalizeCampaignCommand(
  options: FinalizeCampaignCommandOptions
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

  // Upload reward collection image
  const collectionImagePath = path.join(
    __dirname,
    "../../assets",
    "rewards-collection-image.png"
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
    }`
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
    assetBurn: some({ requiredCollection: publicKey(campaign.pledgesCollectionAddress) }),
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
    }`
  );

  // TODO: add all the items to the candy machine (use generic reward for now)
  
  // TODO: update the candy machine to mark it as finalized.
}
