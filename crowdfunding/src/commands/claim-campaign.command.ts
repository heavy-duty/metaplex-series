export interface ClaimCampaignCommandOptions {
  campaignAssetAddress: string;
  pledgeAssetAddress: string;
  backerKeypair: string;
  rpcUrl: string;
  serverKeypair: string;
  logLevel: string;
}

export async function claimCampaignCommand(
  options: ClaimCampaignCommandOptions,
) {
  // Inicializamos umi
  // Leemos el keypair del backer
  // Obtenemos el NFT de la campaña con su metadata
  // Transformamos el NFT de la campaña en un objeto de tipo campaña
  // Obtenemos el NFT del pledge
  // Validamos que el owner del pledge coincide con el keypair del backer
  // Validamos que el estado sea "finalized"
  // Generamos el signer asociado al rewards
  // Minteamos el NFT del rewards y quemamos el NFT del pledge
}
