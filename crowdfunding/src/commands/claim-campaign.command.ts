import { fetchAssetV1 } from "@metaplex-foundation/mpl-core";
import { mintV1 } from "@metaplex-foundation/mpl-core-candy-machine";
import { setComputeUnitLimit } from "@metaplex-foundation/mpl-toolbox";
import {
  createSignerFromKeypair,
  generateSigner,
  publicKey,
  some,
  transactionBuilder,
} from "@metaplex-foundation/umi";
import { base58 } from "@metaplex-foundation/umi/serializers";
import {
  fetchAssetWithMetadata,
  getUmi,
  readKeypairFromFile,
  toCampaign,
} from "../utils";

export interface ClaimCampaignCommandOptions {
  campaignAssetAddress: string;
  pledgeAssetAddress: string;
  backerKeypair: string;
  rpcUrl: string;
  serverKeypair: string;
  logLevel: string;
}

export async function claimCampaignCommand(
  options: ClaimCampaignCommandOptions,
) {
  // Inicializamos umi
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

  // Obtenemos el NFT del pledge
  const pledgeAsset = await fetchAssetV1(
    umi,
    publicKey(options.pledgeAssetAddress),
  );

  // Validamos que el owner del pledge coincide con el keypair del backer
  if (pledgeAsset.owner !== backerKeypair.publicKey) {
    throw new Error("You are not authorized to claim with this pledge");
  }

  // Validamos que el estado sea "finalized"
  if (campaign.status !== "finalized") {
    throw new Error("Only finalized campaigns can have claims");
  }

  // Generamos el signer asociado al rewards
  const rewardSigner = generateSigner(umi);

  // Minteamos el NFT del rewards y quemamos el NFT del pledge
  const mintRewardSignature = await transactionBuilder()
    .add(setComputeUnitLimit(umi, { units: 800_000 }))
    .add(
      mintV1(umi, {
        candyMachine: publicKey(campaign.rewardsCandyMachineAddress),
        asset: rewardSigner,
        collection: publicKey(campaign.rewardsCollectionAddress),
        mintArgs: {
          assetBurn: some({
            requiredCollection: publicKey(campaign.pledgesCollectionAddress),
            asset: publicKey(options.pledgeAssetAddress),
          }),
        },
        minter: createSignerFromKeypair(umi, backerKeypair),
      }),
    )
    .sendAndConfirm(umi);
  console.log(
    `Mint reward (address: ${rewardSigner.publicKey}) signature: ${base58.deserialize(mintRewardSignature.signature)[0]}`,
  );
}
