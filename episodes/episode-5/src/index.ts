// Initialize your workspace
import { createCollectionV1, mplCore } from "@metaplex-foundation/mpl-core";
import {
  addConfigLines,
  create as createCandyMachine,
  mintV1,
  mplCandyMachine,
} from "@metaplex-foundation/mpl-core-candy-machine";
import {
  mplToolbox,
  setComputeUnitLimit,
} from "@metaplex-foundation/mpl-toolbox";
import {
  createGenericFile,
  generateSigner,
  keypairIdentity,
  Signer,
  sol,
  some,
  transactionBuilder,
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

  console.log(keypair.publicKey);

  // Register keypair as identity and payer
  umi = umi.use(keypairIdentity(keypair));

  // Register core nft program
  umi = umi.use(mplCore());

  // Register core candy machine program
  umi = umi.use(mplCandyMachine());

  // Register the Metaplex toolbox
  umi = umi.use(mplToolbox());

  // Register Irys as the uploader
  umi = umi.use(
    irysUploader({
      address: "https://devnet.irys.xyz",
    })
  );

  // Step #1: Create a Collection NFT
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

  const collectionUri = await umi.uploader.uploadJson({
    name: "Core Co-op Collection",
    symbol: "COOP",
    description: "A collection of tokenized co-op shares on Solana",
    image: collectionImage,
  });

  const collectionMintSigner = generateSigner(umi);
  const createCollectionSignature = await createCollectionV1(umi, {
    collection: collectionMintSigner,
    name: "Core Co-op Collection",
    uri: collectionUri,
  }).sendAndConfirm(umi);
  console.log(
    `Create Collection signature: ${
      base58.deserialize(createCollectionSignature.signature)[0]
    }`
  );

  // Step #2: Create a Core Candy Machine on-chain
  const candyMachineSigner = generateSigner(umi);
  const candyMachineConfigLineSettings = some({
    prefixName: "Co-op Share #$ID+1$",
    nameLength: 0,
    prefixUri: "https://gateway.irys.xyz/",
    uriLength: 44,
    isSequential: false,
  });
  const candyMachineGuards = {
    solPayment: some({ lamports: sol(0.001), destination: keypair.publicKey }),
  };

  const createCandyMachineTransaction = await createCandyMachine(umi, {
    candyMachine: candyMachineSigner,
    collection: collectionMintSigner.publicKey,
    collectionUpdateAuthority: umi.identity,
    itemsAvailable: 3,
    configLineSettings: candyMachineConfigLineSettings,
    guards: candyMachineGuards,
  });
  const createCandyMachineSignature =
    await createCandyMachineTransaction.sendAndConfirm(umi);
  console.log(
    `Create Core Candy Machine signature: ${
      base58.deserialize(createCandyMachineSignature.signature)[0]
    }`
  );

  // Step #3: Prepare all items
  let itemUris: string[] = [];

  for (let i = 0; i < 3; i++) {
    const imagePath = path.join(
      __dirname,
      "../assets",
      `item-${i + 1}-image.png`
    );
    const imageBuffer = await readFile(imagePath);
    const imageFile = createGenericFile(imageBuffer, imagePath, {
      contentType: "image/png",
    });
    const [image] = await umi.uploader.upload([imageFile]);

    const uri = await umi.uploader.uploadJson({
      name: `Co-op Share #${i + 1}`,
      symbol: "SHARE",
      description: "A tokenized share in our co-op, built on Solana",
      image,
    });

    itemUris.push(uri);
  }

  const candyMachineConfigLines = itemUris.map((uri) => {
    const uriSegments = uri.split("/");
    const assetHash = uriSegments[uriSegments.length - 1];

    return { name: "", uri: assetHash };
  });

  const addConfigLinesSignature = await addConfigLines(umi, {
    candyMachine: candyMachineSigner.publicKey,
    index: 0,
    configLines: candyMachineConfigLines,
  }).sendAndConfirm(umi);
  console.log(
    `Add Config Lines signature: ${
      base58.deserialize(addConfigLinesSignature.signature)[0]
    }`
  );

  // Step #4: Minting the NFTs from the Core Candy Machine
  let mintSigners: Signer[] = [];

  for (let i = 0; i < 3; i++) {
    const mintSigner = generateSigner(umi);
    const mintSignature = await transactionBuilder()
      .add(setComputeUnitLimit(umi, { units: 800_000 }))
      .add(
        mintV1(umi, {
          candyMachine: candyMachineSigner.publicKey,
          asset: mintSigner,
          collection: collectionMintSigner.publicKey,
          mintArgs: {
            solPayment: some({
              lamports: sol(0.001),
              destination: keypair.publicKey,
            }),
          },
        })
      )
      .sendAndConfirm(umi);
    console.log(
      `Mint #${i + 1} signature: ${
        base58.deserialize(mintSignature.signature)[0]
      }`
    );

    mintSigners.push(mintSigner);
  }

  // Step #5: Print everything we just created
  console.log("\nResults:");
  console.log(`Collection Mint: ${collectionMintSigner.publicKey}`);
  console.log(`Core Candy Machine Mint: ${candyMachineSigner.publicKey}`);
  mintSigners.forEach((mintSigner, index) =>
    console.log(`NFT #${index + 1} Mint: ${mintSigner.publicKey}`)
  );
}

main().catch(console.error);
