export interface CreateCampaignCommandOptions {
  goal: string;
  name: string;
  description: string;
  symbol: string;
  creatorKeypair: string;
  rpcUrl: string;
  serverKeypair: string;
  logLevel: string;
}

export async function createCampaignCommand(
  options: CreateCampaignCommandOptions,
) {
  // Inicializamos Umi
  // Leemos el keypair del creador
  // Subimos la imagen de la campaña
  // Subimos la metadata de la campaña
  // Generamos el signer asociado al NFT de la campaña
  // Creamos el NFT de la campaña usando core
}
