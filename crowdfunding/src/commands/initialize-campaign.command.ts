export interface InitializeCampaignCommandOptions {
  campaignAssetAddress: string;
  creatorKeypair: string;
  rpcUrl: string;
  serverKeypair: string;
  logLevel: string;
}

export async function initializeCampaignCommand(
  options: InitializeCampaignCommandOptions,
) {
  // Inicializamos Umi
  // Leemos el keypair del creador
  // Obtenemos el NFT de la campaña con su metadata
  // Transformamos el NFT y su metadata en un objeto de tipo campaña
  // Validamos que la campaña esta en estado "draft"
  // Validamos que el creador de la campaña coincide con el keypair dado
  // Subimos la imagen de la coleccion de pledges
  // Subimos la metadata de la coleccion de pledges
  // Generamos el signer asociado a la coleccion de pledges
  // Creamos la coleccion de pledges
  // Actualizamos el estado de la campaña y guardamos la direccion de la coleccion de pledges
}
