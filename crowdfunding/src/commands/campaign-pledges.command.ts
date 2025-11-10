import { fetchAssetsByCollection } from "@metaplex-foundation/mpl-core";
import { publicKey } from "@metaplex-foundation/umi";
import {
  fetchAssetWithMetadata,
  getUmi,
  readKeypairFromFile,
  toCampaign,
} from "../utils";

export interface CampaignPledgesCommandOptions {
  campaignAssetAddress: string;
  backerKeypair: string;
  rpcUrl: string;
  serverKeypair: string;
  logLevel: string;
}

export async function campaignPledgesCommand(
  options: CampaignPledgesCommandOptions,
) {
  // Inicializamos Umi
  const umi = await getUmi(options.serverKeypair);

  // Obtenemos el NFT de la campaña con su metadata
  const campaignAssetWithMetadata = await fetchAssetWithMetadata({
    campaignAssetAddress: options.campaignAssetAddress,
    serverKeypair: options.serverKeypair,
  });

  // Transformamos el NFT de la campaña en un objeto de tipo campaña
  const campaign = toCampaign(campaignAssetWithMetadata);

  // Validamos que la campaña no este en draft
  if (campaign.status === "draft") {
    throw new Error("Draft campaigns have no pledges collection address.");
  }

  // Obtenemos todos los pledge NFTs
  const pledgeNfts = await fetchAssetsByCollection(
    umi,
    publicKey(campaign.pledgesCollectionAddress),
  );

  // Leemos el keypair del backer
  const backerKeypair = await readKeypairFromFile(umi, options.backerKeypair);

  // Filtramos los NFTs por el owner usando el keypair del backer
  const myPledgeNfts = pledgeNfts.filter(
    (pledgeNft) => pledgeNft.owner === backerKeypair.publicKey,
  );

  // Imprimimos el nombre y direccion de cada pledge NFT del backer
  myPledgeNfts.forEach((pledgeNft) => {
    console.log(` - ${pledgeNft.name}: ${pledgeNft.publicKey}`);
  });
}
