import { mplCore } from "@metaplex-foundation/mpl-core";
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { mplToolbox } from "@metaplex-foundation/mpl-toolbox";
import { keypairIdentity } from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
import { clusterApiUrl } from "@solana/web3.js";
import { readKeypairFromFile } from "./read-keypair-from-file";

export async function getUmi(serverKeypair: string) {
  // Initialize UMI
  let umi = createUmi(clusterApiUrl("devnet"), { commitment: "confirmed" });

  // Read keypair file
  const keypair = await readKeypairFromFile(umi, serverKeypair);

  // Register keypair as identity and payer
  umi = umi.use(keypairIdentity(keypair));

  // Register core nft program
  umi = umi.use(mplCore());

  // Register the Metaplex toolbox
  umi = umi.use(mplToolbox());

  // Register token metadata program
  umi = umi.use(mplTokenMetadata());

  // Register Irys as the uploader
  umi = umi.use(
    irysUploader({
      address: "https://devnet.irys.xyz",
    }),
  );

  return umi;
}
