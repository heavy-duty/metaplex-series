import path from "path";
import {
  createCandyMachineAction,
  createCoreCandyMachineAction,
} from "./actions";
import { getUmi } from "./utils";

async function main() {
  // Ubicación del archivo que contiene el keypair
  const keypairPath = path.join(__dirname, "../../keypair.json");

  // Inicializamos la instancia de Umi
  const umi = await getUmi(keypairPath);

  // Creamos una Candy Machine
  console.log("\nCreate Candy Machine:");
  await createCandyMachineAction(umi);

  // Creamos un Core Candy Machine
  console.log("\nCreate Core Candy Machine:");
  await createCoreCandyMachineAction(umi);
}

main();
