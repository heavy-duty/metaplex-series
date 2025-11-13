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
  // Inicializamos umi
  const umi = await getUmi(options.serverKeypair);

  // Leemos el keypair del creador
  const creatorKeypair = await readKeypairFromFile(umi, options.creatorKeypair);

  // Obtenemos el NFT de la campaña con su metadata
  const campaignAssetWithMetadata = await fetchAssetWithMetadata({
    serverKeypair: options.serverKeypair,
    campaignAssetAddress: options.campaignAssetAddress,
  });

  // Transformamos el NFT con su metadata en un objeto de tipo campaña
  const campaign = toCampaign(campaignAssetWithMetadata);

  // Validamos que el estado sea "work in progress"
  if (campaign.status !== "work in progress") {
    throw new Error("Only campaigns in progress can be finalized");
  }

  // Validamos que el creador coincide con el keypair del creador
  if (campaign.creatorWallet !== creatorKeypair.publicKey) {
    throw new Error("Not authorized to finalize this campaign");
  }

  // Subimos la imagen de la coleccion de rewards
  const rewardCollectionImage = await uploadImage(
    umi,
    path.join(__dirname, "../../assets", "rewards-collection-image.png"),
  );

  // Subimos la metadata de la coleccion de rewards
  const rewardCollectionUri = await umi.uploader.uploadJson({
    name: "Rewards Collection",
    description: "A collection of rewards for a campaign",
    image: rewardCollectionImage,
  });

  // Generamos un signer asociado a la coleccion de rewards
  const rewardsCollectionSigner = generateSigner(umi);

  // Creamos la coleccion de rewards
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

  // Generamos un signer asociado a la candy machine de rewards
  const rewardsCandyMachineSigner = generateSigner(umi);

  // Calculamos la cantidad de rewards disponibles
  const rewardsAvailable = campaign.totalPledges - campaign.refundedPledges;

  // Creamos la transaccion para crear la candy machine de rewards
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

  // Enviamos y confirmamos la transaccion para crear la candy machine de rewards
  const createRewardsCandyMachineSignature =
    await createRewardsCandyMachineTransaction.sendAndConfirm(umi);
  console.log(
    `Create Core Candy Machine (address: ${rewardsCandyMachineSigner.publicKey}) signature: ${
      base58.deserialize(createRewardsCandyMachineSignature.signature)[0]
    }`,
  );

  // Subimos imagen de los rewards (reusaremos uno para el ejemplo)
  const rewardImage = await uploadImage(
    umi,
    path.join(__dirname, "../../assets", "reward-image.png"),
  );

  // Subimos la metadata de los rewards (tambien reusaremos esto)
  const rewardUri = await umi.uploader.uploadJson({
    name: "Reward",
    symbol: "REWARD",
    description: "A reward from a successful campaign.",
    image: rewardImage,
  });

  // Obtenemos el hash asociado al rewards
  const rewardUriSegments = rewardUri.split("/");
  const rewardAssetHash = rewardUriSegments[rewardUriSegments.length - 1];

  // Agregamos los elementos a la candy machine por lotes
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

  // Marcamos el estado de la campaña como finalizada
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
      ],
    },
  }).sendAndConfirm(umi);
  console.log(
    `Update Campaign (address: ${campaign.address}) signature: ${
      base58.deserialize(updateCampaignSignature.signature)[0]
    }`,
  );
}
