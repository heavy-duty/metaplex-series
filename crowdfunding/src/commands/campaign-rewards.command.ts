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
  // Obtenemos el NFT de la campaña con su metadata
  // Transformamos el NFT de la campaña en un objeto tipo campaña
  // Validamos que el estado sea "finalized"
  // Obtenemos todos los rewards asociados a la campaña
  // Leemos el keypair del backer
  // Filtramos los rewards usando la direccion del backer
  // Imprimos el nombre y direccion de cada rewards
}
