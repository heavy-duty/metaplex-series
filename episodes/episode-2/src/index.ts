import {
  createFungible,
  createFungibleAsset,
  createNft,
  createProgrammableNft,
  mintV1,
  mplTokenMetadata,
  TokenStandard,
} from "@metaplex-foundation/mpl-token-metadata";
import {
  createTokenIfMissing,
  getSplAssociatedTokenProgramId,
  mplToolbox,
} from "@metaplex-foundation/mpl-toolbox";
import {
  createGenericFile,
  generateSigner,
  keypairIdentity,
  percentAmount,
  publicKey,
  some,
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

  // Register Irys as the uploader
  umi = umi.use(
    irysUploader({
      address: "https://devnet.irys.xyz",
    }),
  );

  // Upload non-fungible image to Irys
  const nonFungibleImagePath = path.join(
    __dirname,
    "../assets",
    "non-fungible-image.png",
  );
  const nonFungibleImageBuffer = await readFile(nonFungibleImagePath);
  const nonFungibleImageFile = createGenericFile(
    nonFungibleImageBuffer,
    nonFungibleImagePath,
    {
      contentType: "image/png",
    },
  );
  const [nonFungibleImage] = await umi.uploader.upload([nonFungibleImageFile]);

  // Upload non-fungible metadata to Irys
  const nonFungibleUri = await umi.uploader.uploadJson({
    name: "No Fungible",
    symbol: "NFUNG",
    description: "Este un token no fungible de Metaplex",
    image: nonFungibleImage,
  });

  // Create the non-fungible on-chain
  const nonFungibleMintSigner = generateSigner(umi);
  const createNonFungibleSignature = await createNft(umi, {
    mint: nonFungibleMintSigner,
    name: "Mi no fungible",
    uri: nonFungibleUri,
    sellerFeeBasisPoints: percentAmount(0),
    tokenOwner: publicKey("8r8dZAgfEicf6KXoSC5xV64S4Wm2RWpq8kfaxKxKJThP"),
  }).sendAndConfirm(umi);
  console.log(
    `Create non-fungible signature: ${
      base58.deserialize(createNonFungibleSignature.signature)[0]
    }`,
  );

  // Upload fungible image to Irys
  const fungibleImagePath = path.join(
    __dirname,
    "../assets",
    "fungible-image.png",
  );
  const fungibleImageBuffer = await readFile(fungibleImagePath);
  const fungibleImageFile = createGenericFile(
    fungibleImageBuffer,
    fungibleImagePath,
    {
      contentType: "image/png",
    },
  );
  const [fungibleImage] = await umi.uploader.upload([fungibleImageFile]);

  // Upload fungible metadata to Irys
  const fungibleUri = await umi.uploader.uploadJson({
    name: "Fungible",
    symbol: "FUNG",
    description: "Este es un token fungible de Metaplex",
    image: fungibleImage,
  });

  // Create the fungible on-chain
  const fungibleMintSigner = generateSigner(umi);
  const createFungibleSignature = await createFungible(umi, {
    mint: fungibleMintSigner,
    name: "Mi fungible",
    uri: fungibleUri,
    sellerFeeBasisPoints: percentAmount(0),
    decimals: some(6),
  }).sendAndConfirm(umi);
  console.log(
    `Create fungible signature: ${
      base58.deserialize(createFungibleSignature.signature)[0]
    }`,
  );

  // Create ATA of the receiver of the fungible
  const createFungibleAssociatedTokenAccountSignature =
    await createTokenIfMissing(umi, {
      mint: fungibleMintSigner.publicKey,
      owner: publicKey("8r8dZAgfEicf6KXoSC5xV64S4Wm2RWpq8kfaxKxKJThP"),
      ataProgram: getSplAssociatedTokenProgramId(umi),
    }).sendAndConfirm(umi);
  console.log(
    `Create fungible ATA signature: ${
      base58.deserialize(
        createFungibleAssociatedTokenAccountSignature.signature,
      )[0]
    }`,
  );

  // Mint the NFT to a wallet
  const mintFungibleSignature = await mintV1(umi, {
    mint: fungibleMintSigner.publicKey,
    amount: 1,
    tokenOwner: publicKey("8r8dZAgfEicf6KXoSC5xV64S4Wm2RWpq8kfaxKxKJThP"),
    tokenStandard: TokenStandard.NonFungible,
  }).sendAndConfirm(umi);
  console.log(
    `Mint fungible signature: ${
      base58.deserialize(mintFungibleSignature.signature)[0]
    }`,
  );

  // Upload semi fungible image to Irys
  const semiFungibleImagePath = path.join(
    __dirname,
    "../assets",
    "fungible-asset-image.png",
  );
  const semiFungibleImageBuffer = await readFile(semiFungibleImagePath);
  const semiFungibleImageFile = createGenericFile(
    semiFungibleImageBuffer,
    semiFungibleImagePath,
    {
      contentType: "image/png",
    },
  );
  const [semiFungibleImage] = await umi.uploader.upload([
    semiFungibleImageFile,
  ]);

  // Upload semi fungible metadata to Irys
  const semiFungibleUri = await umi.uploader.uploadJson({
    name: "Semi Fungible",
    symbol: "SFUNG",
    description: "Este es token semi fungible de Metaplex",
    image: semiFungibleImage,
    attributes: [{ trait_type: "Es un asset", value: "SI" }],
  });

  // Create the semi fungible on-chain
  const semiFungibleMintSigner = generateSigner(umi);
  const createFungibleAssetSignature = await createFungibleAsset(umi, {
    mint: semiFungibleMintSigner,
    name: "Mi asset fungible",
    uri: semiFungibleUri,
    sellerFeeBasisPoints: percentAmount(0),
    decimals: some(6),
  }).sendAndConfirm(umi);
  console.log(
    `Create semi fungible signature: ${
      base58.deserialize(createFungibleAssetSignature.signature)[0]
    }`,
  );

  // Create ATA of the receiver of the semi fungible
  const createFungibleAssetAssociatedTokenAccountSignature =
    await createTokenIfMissing(umi, {
      mint: semiFungibleMintSigner.publicKey,
      owner: publicKey("8r8dZAgfEicf6KXoSC5xV64S4Wm2RWpq8kfaxKxKJThP"),
      ataProgram: getSplAssociatedTokenProgramId(umi),
    }).sendAndConfirm(umi);
  console.log(
    `Create semi fungible ATA signature: ${
      base58.deserialize(
        createFungibleAssetAssociatedTokenAccountSignature.signature,
      )[0]
    }`,
  );

  // Mint the semi fungible to a wallet
  const mintFungibleAssetSignature = await mintV1(umi, {
    mint: semiFungibleMintSigner.publicKey,
    amount: 1,
    tokenOwner: publicKey("8r8dZAgfEicf6KXoSC5xV64S4Wm2RWpq8kfaxKxKJThP"),
    tokenStandard: TokenStandard.FungibleAsset,
  }).sendAndConfirm(umi);
  console.log(
    `Mint semi fungible signature: ${
      base58.deserialize(mintFungibleAssetSignature.signature)[0]
    }`,
  );

  // Upload programmable non-fungible image to Irys
  const programmableNonFungibleImagePath = path.join(
    __dirname,
    "../assets",
    "programmable-non-fungible-image.png",
  );
  const programmableNonFungibleImageBuffer = await readFile(
    programmableNonFungibleImagePath,
  );
  const programmableNonFungibleImageFile = createGenericFile(
    programmableNonFungibleImageBuffer,
    programmableNonFungibleImagePath,
    {
      contentType: "image/png",
    },
  );
  const [programmableNonFungibleImage] = await umi.uploader.upload([
    programmableNonFungibleImageFile,
  ]);

  // Upload programmable non-fungible metadata to Irys
  const programmableNonFungibleUri = await umi.uploader.uploadJson({
    name: "No Fungible Programable",
    symbol: "PNFUNG",
    description: "Este es un token no fungible programable de Metaplex",
    image: programmableNonFungibleImage,
  });

  // Create the programmable non-fungible on-chain
  const programmableNonFungibleMintSigner = generateSigner(umi);
  const createProgrammableNonFungibleSignature = await createProgrammableNft(
    umi,
    {
      mint: programmableNonFungibleMintSigner,
      name: "Mi no fungible programable",
      uri: programmableNonFungibleUri,
      sellerFeeBasisPoints: percentAmount(0),
      tokenOwner: publicKey("8r8dZAgfEicf6KXoSC5xV64S4Wm2RWpq8kfaxKxKJThP"),
    },
  ).sendAndConfirm(umi);
  console.log(
    `Create programmable non-fungible signature: ${
      base58.deserialize(createProgrammableNonFungibleSignature.signature)[0]
    }`,
  );
}

main();
