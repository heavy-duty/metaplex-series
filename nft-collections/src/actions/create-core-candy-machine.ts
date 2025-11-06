import { createCollectionV1 } from "@metaplex-foundation/mpl-core";
import {
  addConfigLines,
  create as createCandyMachine,
  mintV1,
} from "@metaplex-foundation/mpl-core-candy-machine";
import { setComputeUnitLimit } from "@metaplex-foundation/mpl-toolbox";
import {
  generateSigner,
  Signer,
  sol,
  some,
  transactionBuilder,
  Umi,
} from "@metaplex-foundation/umi";
import { base58 } from "@metaplex-foundation/umi/serializers";
import path from "path";
import { uploadImageAndMetadata } from "../utils";

export async function createCoreCandyMachineAction(umi: Umi) {
  // Subimos la imagen y la metadata de la coleccion a la red de irys
  const collectionImagePath = path.join(
    __dirname,
    "../../assets",
    "collection-image.png",
  );
  const collectionUri = await uploadImageAndMetadata(
    umi,
    "Mi colección de NFTs",
    "COLL",
    "Esta es mi primera colección de NFTs en Solana",
    collectionImagePath,
  );

  // Generamos el signer asociado al mint de la coleccion
  const collectionMintSigner = generateSigner(umi);
  console.log(
    `   > Collection Mint Address: ${collectionMintSigner.publicKey}`,
  );

  // Creamos la coleccion en la red de Solana
  const createCollectionSignature = await createCollectionV1(umi, {
    collection: collectionMintSigner,
    name: "Mi coleccion de NFTs",
    uri: collectionUri,
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
  const candyMachineConfigLineSettings = some({
    prefixName: "Mi NFT #$ID+1$",
    nameLength: 0,
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
    collection: collectionMintSigner.publicKey,
    collectionUpdateAuthority: umi.identity,
    itemsAvailable: 3,
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
  let itemUris: string[] = [];

  for (let i = 0; i < 3; i++) {
    const imagePath = path.join(
      __dirname,
      `../../assets/item-${i + 1}-image.png`,
    );
    const uri = await uploadImageAndMetadata(
      umi,
      `Mi NFT #${i + 1}`,
      "FAM",
      "Este NFT es parte de mi primera candy machine",
      imagePath,
    );

    itemUris.push(uri);
  }

  // Obtenemos la configuracion de los elementos de la Candy Machine
  const candyMachineConfigLines = itemUris.map((uri) => {
    const uriSegments = uri.split("/");
    const assetHash = uriSegments[uriSegments.length - 1];

    return { name: "", uri: assetHash };
  });

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

  for (let i = 0; i < 3; i++) {
    // Generamos el signer asociado al mint del NFT
    const mintSigner = generateSigner(umi);
    console.log(`   > NFT #${i + 1} Address: ${mintSigner.publicKey}`);

    // Minteamos el NFT en la red de Solana
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
