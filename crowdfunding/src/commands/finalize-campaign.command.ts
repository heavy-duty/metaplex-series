export interface FinalizeCampaignCommandOptions {
  campaignAssetAddress: string;
  creatorKeypair: string;
  rpcUrl: string;
  serverKeypair: string;
  logLevel: string;
}

export async function finalizeCampaignCommand(
  options: FinalizeCampaignCommandOptions,
) {
  // Inicializamos umi
  // Leemos el keypair del creador
  // Obtenemos el NFT de la campaña con su metadata
  // Transformamos el NFT con su metadata en un objeto de tipo campaña
  // Validamos que el estado sea "work in progress"
  // Validamos que el creador coincide con el keypair del creador
  // Subimos la imagen de la coleccion de rewards
  // Subimos la metadata de la coleccion de rewards
  // Generamos un signer asociado a la coleccion de rewards
  // Creamos la coleccion de rewards
  // Generamos un signer asociado a la candy machine de rewards
  // Calculamos la cantidad de rewards disponibles
  // Creamos la transaccion para crear la candy machine de rewards
  // Enviamos y confirmamos la transaccion para crear la candy machine de rewards
  // Subimos imagen de los rewards (reusaremos uno para el ejemplo)
  // Subimos la metadata de los rewards (tambien reusaremos esto)
  // Obtenemos el hash asociado al rewards
  // Agregamos los elementos a la candy machine por lotes
  // Marcamos el estado de la campaña como finalizada
}
