export interface PledgeCampaignCommandOptions {
  campaignAssetAddress: string;
  backerKeypair: string;
  rpcUrl: string;
  serverKeypair: string;
  logLevel: string;
}

export async function pledgeCampaignCommand(
  options: PledgeCampaignCommandOptions,
) {
  // Inicializamos Umi
  // Leemos el keypair del backer
  // Obtenemos el NFT de la campaña con su metadata
  // Transformamos el NFT de la campaña en un objeto de tipo campaña
  // Validamos que la campaña este activa
  // Buscamos la direccion del asset signer de la campaña
  // Transferimos SOL al asset signer de la campaña
  // Subimos la imagen del pledge
  // Subimos la metadata del pledge
  // Obtenemos la coleccion de pledges
  // Generamos el signer asociado al pledge
  // Creamos el NFT del pledge
  // Actualizamos la cantidad total de pledges en la campaña
}
