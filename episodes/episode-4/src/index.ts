import {
  createCollection,
  create as createCoreNft,
  fetchAsset,
  fetchCollection,
  mplCore,
} from "@metaplex-foundation/mpl-core";
import { mplToolbox } from "@metaplex-foundation/mpl-toolbox";
import {
  createGenericFile,
  generateSigner,
  keypairIdentity,
  publicKey,
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
  umi = umi.use(mplCore());

  // Register the Metaplex toolbox
  umi = umi.use(mplToolbox());

  // Register Irys as the uploader
  umi = umi.use(
    irysUploader({
      address: "https://devnet.irys.xyz",
    })
  );

  // Upload collection image to Irys
  const collectionImagePath = path.join(
    __dirname,
    "../assets",
    "collection-image.png"
  );
  const collectionImageBuffer = await readFile(collectionImagePath);
  const collectionImageFile = createGenericFile(
    collectionImageBuffer,
    collectionImagePath,
    {
      contentType: "image/png",
    }
  );
  const [collectionImage] = await umi.uploader.upload([collectionImageFile]);

  // Upload collection metadata to Irys
  const collectionUri = await umi.uploader.uploadJson({
    name: "Mi colección de Core NFTs",
    symbol: "COLL",
    description: "Esta es mi primera colección de Core NFTs en Solana",
    image: collectionImage,
  });

  // Create Core Collection on-chain
  const collectionSigner = generateSigner(umi);
  const createCollectionSignature = await createCollection(umi, {
    collection: collectionSigner,
    name: "Mi colección de Core NFTs",
    uri: collectionUri,
  }).sendAndConfirm(umi);
  console.log(
    `Create Collection signature: ${
      base58.deserialize(createCollectionSignature.signature)[0]
    }`
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
    name: "Mi primer Core NFT",
    symbol: "FAM",
    description: "Este es mi primer Core NFT de Metaplex",
    image,
  });

  // Create the NFT
  const assetSigner = generateSigner(umi);
  const collection = await fetchCollection(umi, collectionSigner.publicKey);
  const createSignature = await createCoreNft(umi, {
    asset: assetSigner,
    name: "Mi Core NFT",
    uri,
    collection,
    owner: publicKey("8r8dZAgfEicf6KXoSC5xV64S4Wm2RWpq8kfaxKxKJThP"),
    plugins: [
      {
        type: "Autograph",
        signatures: [
          {
            address: keypair.publicKey,
            message: "I approve this",
          },
        ],
      },
    ],
  }).sendAndConfirm(umi);
  console.log(
    `Create Core NFT signature: ${
      base58.deserialize(createSignature.signature)[0]
    }`
  );

  // Fetch the NFT
  const asset = await fetchAsset(umi, assetSigner.publicKey, {
    skipDerivePlugins: false,
  });

  // Print everything we created
  console.log("\nResults:");
  console.log(`Collection Address: ${collectionSigner.publicKey}`);
  console.log(`Asset Address: ${assetSigner.publicKey}`);
  console.log(
    `Autograph: "${asset.autograph?.signatures[0].message}" by ${asset.autograph?.signatures[0].address}`
  );
}

main();
