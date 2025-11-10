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
  // Leemos el keypair del backer
  // Obtenemos el NFT de la campaña con su metadata
  // Transformamos el NFT de la campaña en un objeto de tipo campaña
  // Validamos que la campaña este activa
  // Obtenemos el NFT del pledge
  // Validamos que el owner del NFT del pledge coincide con el keypair del backer dado
  // Obtenemos la coleccion de pledges
  // Quemamos el NFT del pledge
  // Buscamos la direccion del asset signer de la campaña
  // Creamos un signer que no firme para el asset signer
  // Transferimos del asset signer al backer
  // Actualizamos los pledges reembolsados en la campaña
}
