# Episode #5: Core Candy Machine for Scalable Drops

The Core Candy Machine is Metaplex’s answer to scaling NFT mints without breaking the bank. Built for high-volume projects, it slashes costs and simplifies the process, letting communities—like the 2023 co-op that tokenized shares to raise $200,000 (Solana X posts)—build collective ownership on Solana’s efficient blockchain. In this episode, we’ll dive into the Core Candy Machine’s power, configure it with the Umi SDK in TypeScript, and mint NFTs for a small demo drop of 3 items. With banks funding only 2% of co-ops (Forbes, 2021), this tool hands power to the many, mocking the old gatekeepers who’d rather keep it for themselves.

## Initialize Your Workspace

Before we dive in, set up your environment as we did in Episode 1. Below is the workspace setup tailored for this episode, initializing Umi with the necessary plugins and a Solana devnet wallet.

```ts
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { mplCore } from "@metaplex-foundation/mpl-core";
import { mplCandyMachine } from "@metaplex-foundation/mpl-core-candy-machine";
import { mplToolbox } from "@metaplex-foundation/mpl-toolbox";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
import { keypairIdentity } from "@metaplex-foundation/umi";
import { clusterApiUrl } from "@solana/web3.js";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";

async function main() {
  // Initialize Umi
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

  // Register core NFT program
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
}
```

## Step #1: Create a Core Collection NFT

Every Core Candy Machine requires a Metaplex Certified Collection to group and verify NFTs. This is optimized for the Core Standard’s single-account efficiency.

```ts
import { createGenericFile, generateSigner } from "@metaplex-foundation/umi";
import { createCollectionV1 } from "@metaplex-foundation/mpl-core";
import { base58 } from "@metaplex-foundation/umi/serializers";

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
  name: "Core Co-op Collection",
  symbol: "COOP",
  description: "A collection of tokenized co-op shares on Solana",
  image: collectionImage,
});

// Create Core Collection on-chain
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
```

## Step #2: Create a Core Candy Machine on-chain

The Core Candy Machine is designed for scalability, using a single-account model to keep costs low. We’ll configure it for a small demo drop of 3 items, tied to our Core Collection.

```ts
import {
  create as createCandyMachine,
  some,
} from "@metaplex-foundation/mpl-core-candy-machine";
import { sol } from "@metaplex-foundation/umi";

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

// Create Core Candy Machine on-chain
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
```

## Step #3: Prepare and Load Items

For this demo, we’ll upload metadata for just 3 items, keeping it simple to show the process. No batching is needed for such a small set, unlike the bloated systems of traditional finance.

```ts
import { addConfigLines } from "@metaplex-foundation/mpl-core-candy-machine";

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

// Load items into config lines
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
```

**Note**: With only 3 items, a single `addConfigLines` call is enough. For larger collections, you’d batch to maintain efficiency, unlike centralized systems that falter at scale.

## Step #4: Mint NFTs from the Core Candy Machine

With the Core Candy Machine configured and items loaded, we’ll mint all 3 NFTs to demonstrate the process, empowering you to rival corporate gatekeepers.

```ts
import {
  mintV1,
  setComputeUnitLimit,
} from "@metaplex-foundation/mpl-core-candy-machine";
import { transactionBuilder, Signer } from "@metaplex-foundation/umi";

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
```

## Step #5: Print Results for Inspection

Let’s verify our work by printing the addresses of the Core Collection, Core Candy Machine, and minted NFTs. This transparency exposes the flaws of opaque financial systems.

```ts
console.log("\nResults:");
console.log(`Collection Mint: ${collectionMintSigner.publicKey}`);
console.log(`Core Candy Machine Mint: ${candyMachineSigner.publicKey}`);
mintSigners.forEach((mintSigner, index) =>
  console.log(`NFT #${index + 1} Mint: ${mintSigner.publicKey}`)
);
```

**Example Output**:

```bash
Collection Mint: Bx7kVzWqTU2tHQ68tjRKUdPf6Kapucw1NNpfwuxGEq2F
Core Candy Machine Mint: 9dnkUzWqTU2tHQ68tjRKUdPf6Kapucw1NNpfwuxGEq2F
NFT #1 Mint: 2iENWuutz2qXxzdcHiKG7EysGMcerK8vAiaDqufhYiiY
NFT #2 Mint: 4AmcEfC1tSrFb8ZphN5FZMndywHJwsMg1jJTxC3sV5GT
NFT #3 Mint: 6Bbj4LuizDp5rdSYngf8xcTHGd46MGxwWgRpnDxhzYk
```

## Bonus: Scaling for Real-World Impact

The Core Candy Machine’s efficiency shines even in small demos, but it’s built for thousands of items, like the 2023 co-op’s share drop (Solana X posts). Unlike banks that reject 98% of co-ops (Forbes, 2021), this tool scales seamlessly. Future episodes will add Guards for secure mints, but you’ve just built a system that empowers communities to challenge the elite.
