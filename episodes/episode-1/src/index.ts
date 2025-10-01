import {
  createNft,
  mplTokenMetadata,
} from "@metaplex-foundation/mpl-token-metadata";
import {
  createGenericFile,
  generateSigner,
  keypairIdentity,
  percentAmount,
} from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
import { base58 } from "@metaplex-foundation/umi/serializers";
import { clusterApiUrl } from "@solana/web3.js";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";

async function main() {
  // Initialize UMI
  let umi = createUmi(clusterApiUrl("devnet"), { commitment: "confirmed" });

  // Read keypair file
  const keypairPath = path.join(__dirname, "../../..", "keypair.json");

  if (!existsSync(keypairPath)) {
    console.log(`keypair.json not found. Path: ${keypairPath}`);
    process.exit(0);
  }

  const keypairFile = await readFile(keypairPath);
  const keypair = umi.eddsa.createKeypairFromSecretKey(keypairFile);

  // Register keypair as identity and payer
  umi = umi.use(keypairIdentity(keypair));

  // Register token metadata program
  umi = umi.use(mplTokenMetadata());

  // Register Irys as the uploader
  umi = umi.use(
    irysUploader({
      address: "https://devnet.irys.xyz",
    }),
  );

  // Upload image to Irys
  const imagePath = path.join(__dirname, "../assets", "image.png");
  const imageBuffer = await readFile(imagePath);
  const imageFile = createGenericFile(imageBuffer, imagePath, {
    contentType: "image/png",
  });
  const [image] = await umi.uploader.upload([imageFile]);

  // Upload metadata to Irys
  const uri = await umi.uploader.uploadJson({
    name: "Mi primer NFT",
    symbol: "FAM",
    description: "Este es mi primer NFT de Metaplex",
    image,
  });

  // Create the NFT
  const mintSigner = generateSigner(umi);
  const createSignature = await createNft(umi, {
    mint: mintSigner,
    name: "Mi NFT",
    uri,
    sellerFeeBasisPoints: percentAmount(0),
  }).sendAndConfirm(umi);
  console.log(
    `Create signature: ${base58.deserialize(createSignature.signature)[0]}`,
  );
}

main();
