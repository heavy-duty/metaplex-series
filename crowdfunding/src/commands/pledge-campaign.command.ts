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
  publicKey,
  sol,
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
  // Inicializamos Umi
  const umi = await getUmi(options.serverKeypair);

  // Leemos el keypair del backer
  const backerKeypair = await readKeypairFromFile(umi, options.backerKeypair);

  // Obtenemos el NFT de la campaña con su metadata
  const campaignAssetWithMetadata = await fetchAssetWithMetadata({
    serverKeypair: options.serverKeypair,
    campaignAssetAddress: options.campaignAssetAddress,
  });

  // Transformamos el NFT de la campaña en un objeto de tipo campaña
  const campaign = toCampaign(campaignAssetWithMetadata);

  // Validamos que la campaña este activa
  if (campaign.status !== "active") {
    throw new Error("Only active campaigns can receive pledges");
  }

  // Buscamos la direccion del asset signer de la campaña
  const campaignAssetSigner = findAssetSignerPda(umi, {
    asset: publicKey(campaign.address),
  });

  // Transferimos SOL al asset signer de la campaña
  const transferSolSignature = await transferSol(umi, {
    amount: sol(0.001),
    destination: campaignAssetSigner,
    source: createSignerFromKeypair(umi, backerKeypair),
  }).sendAndConfirm(umi);
  console.log(
    `Transfer 0.001 SOL (to address: ${campaignAssetSigner[0]}) signature: ${
      base58.deserialize(transferSolSignature.signature)[0]
    }`,
  );

  // Subimos la imagen del pledge
  const pledgeImage = await uploadImage(
    umi,
    path.join(__dirname, "../../assets", "pledge-image.png"),
  );

  // Subimos la metadata del pledge
  const pledgeUri = await umi.uploader.uploadJson({
    name: `Pledge #${campaign.totalPledges}`,
    description: `This NFT represents a pledge to the campaign with address: ${campaign.address}`,
    image: pledgeImage,
  });

  // Obtenemos la coleccion de pledges
  const pledgesCollection = await fetchCollection(
    umi,
    publicKey(campaign.pledgesCollectionAddress),
  );

  // Generamos el signer asociado al pledge
  const pledgeSigner = generateSigner(umi);

  // Creamos el NFT del pledge
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

  // Actualizamos la cantidad total de pledges en la campaña
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
      ],
    },
  }).sendAndConfirm(umi);
  console.log(
    `Update Campaign (address: ${campaign.address}) signature: ${
      base58.deserialize(updateCampaignSignature.signature)[0]
    }`,
  );
}
