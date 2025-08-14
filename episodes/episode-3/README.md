# Episode #3

The Candy Machine is the gold standard for minting and distributing NFTs in a fair way. The concept behind it is that you interact with the program by pulling a crank that gives you a random item (NFT) and it comes with batteries included.

The benefits from using the Candy Machine are vast:

- Minimal storage costs by leveraging heuristics.
- Customizable minting experiences via the Candy Guard program (will explore further in a future episode)
- Hide and reveal experiences for minters.

In this episode we'll focus on creating and configuring a Candy Machine and then proceed to mint some NFTs with it.

## Initialize your workspace

Before we start, there's some things that need configuration, luckily for us it's pretty much the same from the previous episodes. You need to copy the code from step #1 of the first episode.

## Step #1: Create a Collection NFT

Each Candy Machine must be assocaited with a Metaplex Certified Collection. This special kind of NFT lets you group NFTs together and enables verification to check if an NFT is legitimate.

```ts
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
```

## Step #2: Create a Candy Machine on-chain

Now that we have all our requirements ready, it's time to create the Candy Machine. The Candy Machine allows us to configure how the items are loaded:

- Config Line Settings: For standard minting process.
- Hidden Settings: For hide-and-reveal experiences.

Note: We'll stick to Config Line Settings during this episode.

```ts
// Register the Candy Machine program
umi = umi.use(mplCandyMachine());

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
```

## Step #3: Prepare all items

Our Candy Machine needs all off-chain data to be loaded before hand, so we'll start there. This works very similarly to previous episodes but this time we'll do it for 3 separate items.

```ts
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
```

Note: Given that our item list is extremely short (3 items), we can do this with a single `addConfigLines` call. For larger collections you'll need to split into small chunks and make separate calls, the index makes it possible to ensure the items are loaded in a certain order.

## Step #4: Minting the NFTs from the Candy Machine

At this moment everything is ready to use, our Candy Machine is created and configured, items have been loaded and their images/metadata has been uploaded off-chain. It's now the time for minters to pull the crank and get an NFT.

```ts
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
```

## Step #5: Print everything we just created

We created our Candy Machine and minted the three NFTs, let's make sure we output the results to the console so we can inspect it later:

```ts
// Print everything we created
console.log("\nResults:");
console.log(`Collection Mint: ${collectionMintSigner.publicKey}`);
console.log(`Candy Machine Mint: ${candyMachineSigner.publicKey}`);

mintSigners.forEach((mintSigner, index) =>
  console.log(`NFT #${index + 1} Mint: ${mintSigner.publicKey}`)
);
```

This will result in something similar to this:

```bash
Collection Mint: Ac4jyZYUkApgdu5iscqW8KiCcbmZozypJDvLNfLYsU1g
Candy Machine Mint: 7dnkUzWqTU2tHQ68tjRKUdPf6Kapucw1NNpfwuxGEq2F
NFT #1 Mint: 14Bbj4LuizDp5rdSYngf8xcTHGd46MGxwWgRpnDxhzYk
NFT #2 Mint: 8AmcEfC1tSrFb8ZphN5FZMndywHJwsMg1jJTxC3sV5GT
NFT #3 Mint: 3iENWuutz2qXxzdcHiKG7EysGMcerK8vAiaDqufhYiiY
```

## Bonus: Reveal experience

Modern reveal experiences when minting are powered by Metaplex too, and it's very easy to achieve. Instead of using `Config Line Settings` we have to use `Hidden Settings`. And the approach is to mint all NFTs with a placeholder image/metadata and once all NFTs have been minted, the creator handles the reveal experience.

The reveal experience can differ from creator to creator, some examples are:

- The creator runs a script that automatically reveals all NFTs.
- The creator has an app where NFT owners can go and have a live reveal experience.

Note: Remember that the authority of the Candy Machine is the one doing the reveal.
