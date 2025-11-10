import {
  execute,
  findAssetSignerPda,
  updatePlugin,
} from "@metaplex-foundation/mpl-core";
import { transferSol } from "@metaplex-foundation/mpl-toolbox";
import {
  createNoopSigner,
  lamports,
  publicKey,
} from "@metaplex-foundation/umi";
import { base58 } from "@metaplex-foundation/umi/serializers";
import {
  fetchAssetWithMetadata,
  getUmi,
  readKeypairFromFile,
  toCampaign,
} from "../utils";

export interface WithdrawCampaignCommandOptions {
  campaignAssetAddress: string;
  creatorKeypair: string;
  rpcUrl: string;
  serverKeypair: string;
  logLevel: string;
}

export async function withdrawCampaignCommand(
  options: WithdrawCampaignCommandOptions,
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

  // Transformamos el NFT de la campaña en un objeto de tipo campaña
  const campaign = toCampaign(campaignAssetWithMetadata);

  // Validamos que el creador de la campaña coincide con el keypair del creador dado
  if (campaign.creatorWallet !== creatorKeypair.publicKey) {
    throw new Error("You are not authorized to withdraw from this campaign");
  }

  // Validamos que la campaña esta activa
  if (campaign.status !== "active") {
    throw new Error("Withdraw is only allowed for active campaigns");
  }

  // Buscamos la direccion del asset signer de la campaña
  const campaignAssetSignerPda = findAssetSignerPda(umi, {
    asset: publicKey(campaign.address),
  });

  // Obtenemos la cuenta del asset signer de la campaña
  const campaignAssetSignerAccount = await umi.rpc.getAccount(
    campaignAssetSignerPda[0],
  );

  // Validamos que existe el asset signer
  if (!campaignAssetSignerAccount.exists) {
    throw new Error("Campaign asset signer account doesn't exist");
  }

  // Calculamos el monto a transferir (todo - 0.001 para la renta)
  const transferAmount = lamports(
    campaignAssetSignerAccount.lamports.basisPoints - BigInt(1000000),
  );

  // Validamos que la meta se cumplio
  if (transferAmount <= lamports(campaign.goal)) {
    throw new Error("There are not enough funds to withdraw from campaign.");
  }

  // Creamos un signer para autorizar la operacion del asset signer
  const campaignAssetSigner = createNoopSigner(campaignAssetSignerPda[0]);

  // Transferimos SOL del asset signer de la campaña al creador
  const transferSolSignature = await execute(umi, {
    asset: campaignAssetWithMetadata,
    instructions: transferSol(umi, {
      amount: transferAmount,
      source: campaignAssetSigner,
      destination: creatorKeypair.publicKey,
    }).getInstructions(),
    payer: umi.identity,
    assetSigner: campaignAssetSignerPda,
  }).sendAndConfirm(umi);
  console.log(
    `Transfer ${Number(transferAmount.basisPoints) / Math.pow(10, transferAmount.decimals)} SOL (to address: ${creatorKeypair.publicKey}) signature: ${
      base58.deserialize(transferSolSignature.signature)[0]
    }`,
  );

  // Actualizamos el estado de la campaña
  const updateCampaignSignature = await updatePlugin(umi, {
    asset: publicKey(options.campaignAssetAddress),
    plugin: {
      type: "Attributes",
      attributeList: [
        { key: "status", value: "work in progress" },
        {
          key: "pledgesCollectionAddress",
          value: campaign.pledgesCollectionAddress
            ? publicKey(campaign.pledgesCollectionAddress)
            : "",
        },
        { key: "totalPledges", value: campaign.totalPledges.toString() },
        {
          key: "refundedPledges",
          value: campaign.refundedPledges.toString(),
        },
      ],
    },
  }).sendAndConfirm(umi);
  console.log(
    `Updated campaign (address: ${campaign.address}) signature: ${base58.deserialize(updateCampaignSignature.signature)[0]}`,
  );
}
