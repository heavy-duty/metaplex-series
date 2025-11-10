import { fetchAssetWithMetadata, toCampaign } from "../utils";

export interface CampaignCommandOptions {
  campaignAssetAddress: string;
  rpcUrl: string;
  serverKeypair: string;
  logLevel: string;
}

export async function campaignCommand(options: CampaignCommandOptions) {
  // Obtenemos el NFT de la campaña con su metadata
  const campaignAssetWithMetadata = await fetchAssetWithMetadata({
    campaignAssetAddress: options.campaignAssetAddress,
    serverKeypair: options.serverKeypair,
  });

  // Transformamos el NFT en un objeto de tipo campaña
  const campaign = toCampaign(campaignAssetWithMetadata);

  // Imprimimos la campaña y sus detalles
  console.log(JSON.stringify(campaign, null, "  "));
}
