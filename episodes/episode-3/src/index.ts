import {
  addConfigLines,
  create as createCandyMachine,
  mintV2,
  mplCandyMachine,
} from "@metaplex-foundation/mpl-candy-machine";
import {
  createNft,
  mplTokenMetadata,
  TokenStandard,
} from "@metaplex-foundation/mpl-token-metadata";
import {
  mplToolbox,
  setComputeUnitLimit,
} from "@metaplex-foundation/mpl-toolbox";
import {
  createGenericFile,
  generateSigner,
  keypairIdentity,
  percentAmount,
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

  // Register keypair as identity and payer
  umi = umi.use(keypairIdentity(keypair));

  // Register token metadata program
  umi = umi.use(mplTokenMetadata());

  // Register the Metaplex toolbox
  umi = umi.use(mplToolbox());

  // Register the Candy Machine program
  umi = umi.use(mplCandyMachine());

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
    name: "Mi colección de NFTs",
    symbol: "COLL",
    description: "Esta es mi primera colección de NFTs en Solana",
    image: collectionImage,
  });

  // Create Collection on-chain
  const collectionMintSigner = generateSigner(umi);
  const createCollectionSignature = await createNft(umi, {
    mint: collectionMintSigner,
    name: "Mi colección de NFTs",
    uri: collectionUri,
    sellerFeeBasisPoints: percentAmount(0),
    isCollection: true,
    collectionDetails: {
      __kind: "V1",
      size: 0,
    },
  }).sendAndConfirm(umi);
  console.log(
    `Create Collection signature: ${
      base58.deserialize(createCollectionSignature.signature)[0]
    }`
  );

  // Define Candy Machine settings
  const candyMachineSigner = generateSigner(umi);
  const candyMachineCreators = [
    {
      address: umi.identity.publicKey,
      verified: true,
      percentageShare: 100,
    },
  ];
  const candyMachineConfigLineSettings = some({
    prefixName: "Mi NFT #$ID+1$",
    nameLength: 0,
    prefixUri: "https://gateway.irys.xyz/",
    uriLength: 44,
    isSequential: false,
  });
  const candyMachineGuards = {
    solPayment: some({ lamports: sol(0.001), destination: keypair.publicKey }),
  };

  // Create Candy Machine on-chain
  const createCandyMachineTransaction = await createCandyMachine(umi, {
    candyMachine: candyMachineSigner,
    collectionMint: collectionMintSigner.publicKey,
    collectionUpdateAuthority: umi.identity,
    tokenStandard: TokenStandard.NonFungible,
    sellerFeeBasisPoints: percentAmount(0),
    itemsAvailable: 3,
    creators: candyMachineCreators,
    configLineSettings: candyMachineConfigLineSettings,
    guards: candyMachineGuards,
  });
  const createCandyMachineSignature =
    await createCandyMachineTransaction.sendAndConfirm(umi);
  console.log(
    `Create Candy Machine signature: ${
      base58.deserialize(createCandyMachineSignature.signature)[0]
    }`
  );

  // Upload metadata of all items
  let itemUris: string[] = [];

  for (let i = 0; i < 3; i++) {
    // Upload image to Irys
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

    // Upload metadata to Irys
    const uri = await umi.uploader.uploadJson({
      name: `Mi NFT #${i + 1}`,
      symbol: "FAM",
      description: "Este NFT es parte de mi primera candy machine",
      image,
    });

    itemUris.push(uri);
  }

  // Map item uris into the config lines format
  const candyMachineConfigLines = itemUris.map((uri) => {
    const uriSegments = uri.split("/");
    const assetHash = uriSegments[uriSegments.length - 1];

    return { name: "", uri: assetHash };
  });

  // Insert items to the candy machine
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

  // Mint all NFTs in the candy machine
  let mintSigners: Signer[] = [];

  for (let i = 0; i < 3; i++) {
    const mintSigner = generateSigner(umi);
    const mintSignature = await transactionBuilder()
      .add(setComputeUnitLimit(umi, { units: 800_000 }))
      .add(
        mintV2(umi, {
          candyMachine: candyMachineSigner.publicKey,
          nftMint: mintSigner,
          collectionMint: collectionMintSigner.publicKey,
          collectionUpdateAuthority: umi.identity.publicKey,
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

  // Print everything we created
  console.log("\nResults:");
  console.log(`Collection Mint: ${collectionMintSigner.publicKey}`);
  console.log(`Candy Machine Mint: ${candyMachineSigner.publicKey}`);

  mintSigners.forEach((mintSigner, index) =>
    console.log(`NFT #${index + 1} Mint: ${mintSigner.publicKey}`)
  );
}

main();
