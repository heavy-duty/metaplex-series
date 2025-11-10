import { create as createCoreNft } from "@metaplex-foundation/mpl-core";
import { generateSigner } from "@metaplex-foundation/umi";
import { base58 } from "@metaplex-foundation/umi/serializers";
import path from "path";
import { getUmi, readKeypairFromFile, uploadImage } from "../utils";

export interface CreateCampaignCommandOptions {
  goal: string;
  name: string;
  description: string;
  symbol: string;
  creatorKeypair: string;
  rpcUrl: string;
  serverKeypair: string;
  logLevel: string;
}

export async function createCampaignCommand(
  options: CreateCampaignCommandOptions,
) {
  // Inicializamos Umi
  const umi = await getUmi(options.serverKeypair);

  // Leemos el keypair del creador
  const creatorKeypair = await readKeypairFromFile(umi, options.creatorKeypair);

  // Subimos la imagen de la campaña
  const campaignImage = await uploadImage(
    umi,
    path.join(__dirname, "../../assets", "campaign-image.png"),
  );

  // Subimos la metadata de la campaña
  const campaignUri = await umi.uploader.uploadJson({
    name: options.name,
    symbol: options.symbol,
    description: options.description,
    image: campaignImage,
    attributes: [
      { trait_type: "goal", value: options.goal },
      { trait_type: "creatorWallet", value: creatorKeypair.publicKey },
    ],
  });

  // Generamos el signer asociado al NFT de la campaña
  const campaignSigner = generateSigner(umi);

  // Creamos el NFT de la campaña usando core
  const createCampaignSignature = await createCoreNft(umi, {
    asset: campaignSigner,
    name: options.name,
    uri: campaignUri,
    plugins: [
      {
        type: "Attributes",
        attributeList: [
          { key: "status", value: "draft" },
          { key: "totalPledges", value: "0" },
          { key: "refundedPledges", value: "0" },
        ],
      },
    ],
  }).sendAndConfirm(umi);
  console.log(
    `Create Campaign NFT (address: ${campaignSigner.publicKey}) signature: ${
      base58.deserialize(createCampaignSignature.signature)[0]
    }`,
  );
}
