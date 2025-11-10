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
  // Inicializamos Umi
  const umi = await getUmi(options.serverKeypair);

  // Leemos el keypair del creador
  const creatorKeypair = await readKeypairFromFile(umi, options.creatorKeypair);

  // Obtenemos el NFT de la campaña con su metadata
  const campaignAssetWithMetadata = await fetchAssetWithMetadata({
    serverKeypair: options.serverKeypair,
    campaignAssetAddress: options.campaignAssetAddress,
  });

  // Transformamos el NFT y su metadata en un objeto de tipo campaña
  const campaign = toCampaign(campaignAssetWithMetadata);

  // Validamos que la campaña esta en estado "draft"
  if (campaign.status !== "draft") {
    throw new Error("Initialize is only allowed for draft campaigns");
  }

  // Validamos que el creador de la campaña coincide con el keypair dado
  if (campaign.creatorWallet !== creatorKeypair.publicKey) {
    throw new Error("You are not authorized to initialize this campaign");
  }

  // Subimos la imagen de la coleccion de pledges
  const pledgesCollectionImage = await uploadImage(
    umi,
    path.join(__dirname, "../../assets", "pledges-collection-image.png"),
  );

  // Subimos la metadata de la coleccion de pledges
  const pledgesCollectionUri = await umi.uploader.uploadJson({
    name: "Pledges Collection",
    symbol: "PLEDGE",
    description: "A collection of pledges for a campaign",
    image: pledgesCollectionImage,
  });

  // Generamos el signer asociado a la coleccion de pledges
  const pledgesCollectionSigner = generateSigner(umi);

  // Creamos la coleccion de pledges
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

  // Actualizamos el estado de la campaña y guardamos la direccion de la coleccion de pledges
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
      ],
    },
  }).sendAndConfirm(umi);
  console.log(
    `Update campaign (address: ${campaign.address}) signature: ${
      base58.deserialize(updateCampaignSignature.signature)[0]
    }`,
  );
}
