import { Umi } from "@metaplex-foundation/umi";
import { existsSync } from "fs";
import { readFile } from "fs/promises";

export async function readKeypairFromFile(umi: Umi, filePath: string) {
  if (!existsSync(filePath)) {
    console.log(`Keypair file not found. Path: ${filePath}`);
    process.exit(0);
  }

  const backerKeypair = await readFile(filePath);

  const keypair = umi.eddsa.createKeypairFromSecretKey(backerKeypair);

  return keypair;
}
