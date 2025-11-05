import path from "path";
import {
  createCoreNftAction,
  createFungibleAction,
  createNftAction,
  createProgrammableNftAction,
  createSemiFungibleAction,
} from "./actions";
import { getUmi } from "./utils";

async function main() {
  // Ubicación del archivo que contiene el keypair
  const keypairPath = path.join(__dirname, "../../keypair.json");

  // Inicializamos la instancia de Umi
  const umi = await getUmi(keypairPath);

  // Creamos un token fungible con token metadata
  console.log("\nCreate Fungible:");
  await createFungibleAction(umi);

  // Creamos un token semi fungible con token metadata
  console.log("\nCreate Semi Fungible:");
  await createSemiFungibleAction(umi);

  // Creamos un NFT con token metadata
  console.log("\nCreate NFT:");
  await createNftAction(umi);

  // Creamos un NFT programable con token metadata
  console.log("\nCreate Progammable NFT:");
  await createProgrammableNftAction(umi);

  // Creamos un NFT con core
  console.log("\nCreate Core NFT:");
  await createCoreNftAction(umi);
}

main();
