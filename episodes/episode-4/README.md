# Episode #4

After millions of NFTs were minted on Solana, the old standards became bloated, costly, and hard to maintain. Metaplex Core is the clean break—a next-gen NFT standard with a simple, single-account design that reduces minting costs, lightens network load, and introduces a flexible plugin system so developers can easily customize asset behavior and functionality.

This new standard reduces the cost of minting an NFT from 0.022 SOL to 0.0029 SOL, in other words, almost 90% reduction cost while simultaneously introducing a simpler model and supporting plugins.

That's why in this episode we'll learn how to use it in Typescript.

## Initialize your workspace

Before we start, there's some things that need configuration, luckily for us it's pretty much the same from the previous episodes. You need to copy the code from step #1 of the first episode.

## Step #1: Register Metaplex Core in Umi

By default, the Metaplex Core interface is not available so we have to register it just like we did for the Candy Machine episode.

```ts
// Register token metadata program
umi = umi.use(mplCore());
```

## Step #2: Create a Core Collection

Our Core NFT will belong to a collection, so the first step is to upload the collection's image and metadata, and then proceed to mint the NFT.

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
```

Note: We're using the `createCollection` method from `@metaplex-foundation/mpl-core` unlike the previous episode that we used the version from `@metaplex-foundation/mpl-token-metadata`.

## Step #3: Create a Core Asset

With a collection available it's time to proceed on minting the asset (the Core NFT), just like before we need an image and its off-chain metadata uploaded, and then we can create the NFT. Similar to `createNft` from `@metaplex-foundation/mpl-token-metadata` we can create the NFT and send it to a wallet in a single call.

To showcase how to add a plugin to an asset, we included one of the simplest plugins, the **Autograph** plugin that lets anyone provide a signature for an NFT. For this example we are using the identity (our loaded keypair) as the autographer to add a `I approve this` message.

```ts
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
```

Note: There are plenty plugins available and you can even create your own, these are listed in the [Core Standard page in the Metaplex docs](https://developers.metaplex.com/core/plugins).

## Step #4: Fetch Asset and print results

We created our Core Collection NFT, a Core NFT and minted to our receiver wallet, let's make sure we output the results to the console so we can inspect it later:

```ts
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
```

This will result in something similar to this in the console:

```bash
Create Collection signature: 3yRnh4QtnLoKhyvSL2NW9cBmEnHYe8LkPqCXQbqAoDmTGU4rXdZiRsofRRniqZ7AkePDGtRbKDQGr4fYyHNhZNeS
Create Core NFT signature: 28dA8fkoa2PtiXCnC4oztHdTyEEnDoMEWo1ZRc3wtALoSEo9NaX9z3YmJHGomhQcXAX1icE5ho9ASvqHJCV57p7U

Results:
Collection Address: GcRwmoy3M4kBbiEY2hdHyvaA4jbAXz8SMpJtGwChBJAp
Asset Address: 4a6LMAcHgSa8Df5HoQ6naxssoyVB4YCMp2zM9xEFKkFj
Autograph: "I approve this" by 3vCnr2RpdGnFM5QkLWcrkcwQSCRUfC5zfdSGWRukuKnq
```
