import {
  clusterApiUrl,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { writeFile } from "fs/promises";
import path from "path";

async function main() {
  // Setup the Solana connection to devnet
  const connection = new Connection(clusterApiUrl("devnet"));

  // Generate a new keypair and airdrop some SOL to it
  const keypair = Keypair.generate();

  console.log(`Public Key: ${keypair.publicKey.toBase58()}`);

  try {
    console.log("Attempt to request airdrop");
    await connection.requestAirdrop(keypair.publicKey, LAMPORTS_PER_SOL);
  } catch (error) {
    console.log("Airdrop failed");
  }

  // Save the keypair in keypair.json in the root folder of the project
  const keypairFilePath = path.join(
    __dirname,
    "../../..",
    `${process.argv[2] || "keypair"}.json`,
  );
  await writeFile(keypairFilePath, keypair.secretKey);
}

main();
