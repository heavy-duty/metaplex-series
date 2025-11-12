import {
  addConfigLines,
  create as createCandyMachine,
  mintV2,
} from "@metaplex-foundation/mpl-candy-machine";
import {
  createNft,
  TokenStandard,
} from "@metaplex-foundation/mpl-token-metadata";
import { setComputeUnitLimit } from "@metaplex-foundation/mpl-toolbox";
import {
  generateSigner,
  percentAmount,
  Signer,
  sol,
  some,
  transactionBuilder,
  Umi,
} from "@metaplex-foundation/umi";
import { base58 } from "@metaplex-foundation/umi/serializers";
import path from "path";
import { uploadImageAndMetadata, weaponsData } from "../utils";

export async function createCandyMachineAction(umi: Umi) {
  // Subimos la imagen y la metadata de la coleccion a la red de irys
  const collectionImagePath = path.join(
    __dirname,
    "../../assets",
    "collection.png",
  );
  const collectionUri = await uploadImageAndMetadata(
    umi,
    "Armas épicas",
    "Colección de armas épicas",
    collectionImagePath,
    [],
  );

  // Generamos el signer asociado al mint de la coleccion
  const collectionMintSigner = generateSigner(umi);
  console.log(
    `   > Collection Mint Address: ${collectionMintSigner.publicKey}`,
  );

  // Creamos la coleccion en la red de Solana
  const createCollectionSignature = await createNft(umi, {
    mint: collectionMintSigner,
    name: "Armas épicas",
    uri: collectionUri,
    sellerFeeBasisPoints: percentAmount(0),
    isCollection: true,
    collectionDetails: {
      __kind: "V1",
      size: 0,
    },
  }).sendAndConfirm(umi);
  console.log(
    `   > Create Collection signature: ${
      base58.deserialize(createCollectionSignature.signature)[0]
    }`,
  );

  // Generamos el signer asociado a la Candy Machine
  const candyMachineSigner = generateSigner(umi);
  console.log(`   > Candy Machine Address: ${candyMachineSigner.publicKey}`);

  // Definimos la configuracion de la Candy Machine
  const candyMachineCreators = [
    {
      address: umi.identity.publicKey,
      verified: true,
      percentageShare: 100,
    },
  ];
  const candyMachineConfigLineSettings = some({
    prefixName: "",
    nameLength: 32,
    prefixUri: "https://gateway.irys.xyz/",
    uriLength: 44,
    isSequential: false,
  });
  const candyMachineGuards = {
    solPayment: some({
      lamports: sol(0.001),
      destination: umi.identity.publicKey,
    }),
  };

  // Creamos la Candy Machine en la red de Solana
  const createCandyMachineTransaction = await createCandyMachine(umi, {
    candyMachine: candyMachineSigner,
    collectionMint: collectionMintSigner.publicKey,
    collectionUpdateAuthority: umi.identity,
    tokenStandard: TokenStandard.NonFungible,
    sellerFeeBasisPoints: percentAmount(0),
    itemsAvailable: 5,
    creators: candyMachineCreators,
    configLineSettings: candyMachineConfigLineSettings,
    guards: candyMachineGuards,
  });
  const createCandyMachineSignature =
    await createCandyMachineTransaction.sendAndConfirm(umi);
  console.log(
    `   > Create Candy Machine signature: ${
      base58.deserialize(createCandyMachineSignature.signature)[0]
    }`,
  );

  // Subimos la imagen y metadata de cada elemento de la Candy Machine
  const candyMachineConfigLines: { name: string; uri: string }[] = [];

  for (const weaponData of weaponsData) {
    const imagePath = path.join(
      __dirname,
      `../../assets/${weaponData.imageName}.png`,
    );
    const uri = await uploadImageAndMetadata(
      umi,
      weaponData.name,
      weaponData.description,
      imagePath,
      weaponData.attributes,
    );

    const uriSegments = uri.split("/");
    const assetHash = uriSegments[uriSegments.length - 1];

    candyMachineConfigLines.push({ name: weaponData.name, uri: assetHash });
  }

  // Agregamos los elementos a la Candy Machine
  const addConfigLinesSignature = await addConfigLines(umi, {
    candyMachine: candyMachineSigner.publicKey,
    index: 0,
    configLines: candyMachineConfigLines,
  }).sendAndConfirm(umi);
  console.log(
    `   > Add Config Lines signature: ${
      base58.deserialize(addConfigLinesSignature.signature)[0]
    }`,
  );

  // Minteamos todos los elementos de la Candy Machine
  let mintSigners: Signer[] = [];

  for (let i = 0; i < 5; i++) {
    // Generamos el signer asociado al mint del NFT
    const mintSigner = generateSigner(umi);
    console.log(`   > NFT #${i + 1} Address: ${mintSigner.publicKey}`);

    // Minteamos el NFT en la red de Solana
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
              destination: umi.identity.publicKey,
            }),
          },
        }),
      )
      .sendAndConfirm(umi);
    console.log(
      `   > Mint #${i + 1} signature: ${
        base58.deserialize(mintSignature.signature)[0]
      }`,
    );

    mintSigners.push(mintSigner);
  }
}
