export interface WithdrawCampaignCommandOptions {
  campaignAssetAddress: string;
  creatorKeypair: string;
  rpcUrl: string;
  serverKeypair: string;
  logLevel: string;
}

export async function withdrawCampaignCommand(
  options: WithdrawCampaignCommandOptions,
) {
  // Inicializamos Umi
  // Leemos el keypair del creador
  // Obtenemos el NFT de la campaña con su metadata
  // Transformamos el NFT de la campaña en un objeto de tipo campaña
  // Validamos que el creador de la campaña coincide con el keypair del creador dado
  // Validamos que la campaña esta activa
  // Buscamos la direccion del asset signer de la campaña
  // Obtenemos la cuenta del asset signer de la campaña
  // Validamos que existe el asset signer
  // Calculamos el monto a transferir (todo - 0.001 para la renta)
  // Validamos que la meta se cumplio
  // Creamos un signer para autorizar la operacion del asset signer
  // Transferimos SOL del asset signer de la campaña al creador
  // Actualizamos el estado de la campaña
}
