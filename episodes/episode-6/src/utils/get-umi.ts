import { mplCore } from "@metaplex-foundation/mpl-core";
import { mplCandyMachine } from "@metaplex-foundation/mpl-core-candy-machine";
import { mplToolbox } from "@metaplex-foundation/mpl-toolbox";
import { keypairIdentity } from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
import { clusterApiUrl } from "@solana/web3.js";
import { existsSync } from "fs";
import { readFile } from "fs/promises";

export async function getUmi(serverKeypair: string) {
  // Initialize UMI
  let umi = createUmi(clusterApiUrl("devnet"), { commitment: "confirmed" });

  // Read keypair file
  if (!existsSync(serverKeypair)) {
    console.log(`Keypair file not found. Path: ${serverKeypair}`);
    process.exit(0);
  }

  const keypairFile = await readFile(serverKeypair);
  const keypair = umi.eddsa.createKeypairFromSecretKey(keypairFile);

  // Register keypair as identity and payer
  umi = umi.use(keypairIdentity(keypair));

  // Register core nft program
  umi = umi.use(mplCore());

  // Register the Metaplex toolbox
  umi = umi.use(mplToolbox());

  // Register the candy machine program
  umi = umi.use(mplCandyMachine());

  // Register Irys as the uploader
  umi = umi.use(
    irysUploader({
      address: "https://devnet.irys.xyz",
    })
  );

  return umi;
}
