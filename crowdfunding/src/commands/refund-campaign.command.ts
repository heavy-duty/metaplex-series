import {
  burn,
  execute,
  fetchAssetV1,
  fetchCollection,
  findAssetSignerPda,
  updatePlugin,
} from "@metaplex-foundation/mpl-core";
import { transferSol } from "@metaplex-foundation/mpl-toolbox";
import {
  createNoopSigner,
  createSignerFromKeypair,
  publicKey,
  sol,
} from "@metaplex-foundation/umi";
import { base58 } from "@metaplex-foundation/umi/serializers";
import {
  fetchAssetWithMetadata,
  getUmi,
  readKeypairFromFile,
  toCampaign,
} from "../utils";

export interface RefundCampaignCommandOptions {
  campaignAssetAddress: string;
  pledgeAssetAddress: string;
  backerKeypair: string;
  rpcUrl: string;
  serverKeypair: string;
  logLevel: string;
}

export async function refundCampaignCommand(
  options: RefundCampaignCommandOptions,
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
    throw new Error("Only active campaigns can have refunds");
  }

  // Obtenemos el NFT del pledge
  const pledgeAsset = await fetchAssetV1(
    umi,
    publicKey(options.pledgeAssetAddress),
  );

  // Validamos que el owner del NFT del pledge coincide con el keypair del backer dado
  if (pledgeAsset.owner !== backerKeypair.publicKey) {
    throw new Error("You are not authorized to refund with this pledge");
  }

  // Obtenemos la coleccion de pledges
  const pledgesCollection = await fetchCollection(
    umi,
    publicKey(campaign.pledgesCollectionAddress),
  );

  // Quemamos el NFT del pledge
  const burnPledgeSignature = await burn(umi, {
    asset: pledgeAsset,
    collection: pledgesCollection,
    authority: createSignerFromKeypair(umi, backerKeypair),
  }).sendAndConfirm(umi);
  console.log(
    `Burn Pledge (address: ${options.pledgeAssetAddress}) signature: ${
      base58.deserialize(burnPledgeSignature.signature)[0]
    }`,
  );

  // Buscamos la direccion del asset signer de la campaña
  const campaignAssetSignerPda = findAssetSignerPda(umi, {
    asset: publicKey(campaign.address),
  });

  // Creamos un signer que no firme para el asset signer
  const campaignAssetSigner = createNoopSigner(campaignAssetSignerPda[0]);

  // Transferimos del asset signer al backer
  const transferSolSignature = await execute(umi, {
    asset: campaignAssetWithMetadata,
    instructions: transferSol(umi, {
      amount: sol(0.001),
      source: campaignAssetSigner,
      destination: backerKeypair.publicKey,
    }).getInstructions(),
    payer: umi.identity,
    assetSigner: campaignAssetSignerPda,
  }).sendAndConfirm(umi);
  console.log(
    `Transfer 0.001 SOL (to address: ${backerKeypair.publicKey}) signature: ${
      base58.deserialize(transferSolSignature.signature)[0]
    }`,
  );

  // Actualizamos los pledges reembolsados en la campaña
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
        { key: "totalPledges", value: campaign.totalPledges.toString() },
        {
          key: "refundedPledges",
          value: (campaign.refundedPledges + 1).toString(),
        },
      ],
    },
  }).sendAndConfirm(umi);
  console.log(
    `Update Campaign (address: ${campaign.address}) signature: ${
      base58.deserialize(updateCampaignSignature.signature)[0]
    }`,
  );
}
