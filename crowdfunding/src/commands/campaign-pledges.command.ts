export interface CampaignPledgesCommandOptions {
  campaignAssetAddress: string;
  backerKeypair: string;
  rpcUrl: string;
  serverKeypair: string;
  logLevel: string;
}

export async function campaignPledgesCommand(
  _options: CampaignPledgesCommandOptions,
) {
  // Inicializamos Umi
  // Obtenemos el NFT de la campaña con su metadata
  // Transformamos el NFT de la campaña en un objeto de tipo campaña
  // Validamos que la campaña no este en draft
  // Obtenemos todos los pledge NFTs
  // Leemos el keypair del backer
  // Filtramos los NFTs por el owner usando el keypair del backer
  // Imprimimos el nombre y direccion de cada pledge NFT del backer
}
