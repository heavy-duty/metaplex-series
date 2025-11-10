export interface CampaignCommandOptions {
  campaignAssetAddress: string;
  rpcUrl: string;
  serverKeypair: string;
  logLevel: string;
}

export async function campaignCommand(options: CampaignCommandOptions) {
  // Obtenemos el NFT de la campaña con su metadata
  // Transformamos el NFT en un objeto de tipo campaña
  // Imprimimos la campaña y sus detalles
}
