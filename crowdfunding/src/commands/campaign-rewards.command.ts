import { fetchAssetsByCollection } from "@metaplex-foundation/mpl-core";
import { publicKey } from "@metaplex-foundation/umi";
import {
  fetchAssetWithMetadata,
  getUmi,
  readKeypairFromFile,
  toCampaign,
} from "../utils";

export interface CampaignRewardsCommandOptions {
  campaignAssetAddress: string;
  backerKeypair: string;
  rpcUrl: string;
  serverKeypair: string;
  logLevel: string;
}

export async function campaignRewardsCommand(
  options: CampaignRewardsCommandOptions,
) {
  // Inicializamos umi
  const umi = await getUmi(options.serverKeypair);

  // Obtenemos el NFT de la campaña con su metadata
  const campaignAssetWithMetadata = await fetchAssetWithMetadata({
    campaignAssetAddress: options.campaignAssetAddress,
    serverKeypair: options.serverKeypair,
  });

  // Transformamos el NFT de la campaña en un objeto tipo campaña
  const campaign = toCampaign(campaignAssetWithMetadata);

  // Validamos que el estado sea "finalized"
  if (campaign.status !== "finalized") {
    throw new Error("Only finalized campaigns have rewards");
  }

  // Obtenemos todos los rewards asociados a la campaña
  const rewardNfts = await fetchAssetsByCollection(
    umi,
    publicKey(campaign.rewardsCollectionAddress),
  );

  // Leemos el keypair del backer
  const backerKeypair = await readKeypairFromFile(umi, options.backerKeypair);

  // Filtramos los rewards usando la direccion del backer
  const myRewardNfts = rewardNfts.filter(
    (rewardNft) => rewardNft.owner === backerKeypair.publicKey,
  );

  // Imprimos el nombre y direccion de cada rewards
  myRewardNfts.forEach((rewardNft) => {
    console.log(` - ${rewardNft.name}: ${rewardNft.publicKey}`);
  });
}
