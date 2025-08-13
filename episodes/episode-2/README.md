# Episode #2

The Token Metadata program is more than just NFTs, it can be used for fungible tokens as well. Actually, the vast majority of **fungible** tokens in Solana use the Token Metadata program to add additional context like name, symbol, image and description.

The Token Standard defines multiple types of tokens:

- Non Fungible: The traditional NFT, the one we used in the previous episode.
- Fungible Asset: A fungible token that also has attributes.
- Fungible: A simple token with metadata attached to it.
- Programmable Non Fungible: A special kind of non-fungible token with associated authorization rules.

Note: Do not confuse the Token Standard with the Digital Asset Standard.

Let's learn how to use this in Typescript.

## Initialize your workspace

Before we start, there's some things that need configuration, luckily for us it's pretty much the same from the previous episode. You need to copy the code from step #1.

## Step #1: Create a non fungible

While this is covered in the previous episode, this time we'll use the helper method `createNft` to create the mint, the associated token account and minting the token to a wallet.

```ts
// Upload non-fungible image to Irys
const nonFungibleImagePath = path.join(
  __dirname,
  "../assets",
  "non-fungible-image.png"
);
const nonFungibleImageBuffer = await readFile(nonFungibleImagePath);
const nonFungibleImageFile = createGenericFile(
  nonFungibleImageBuffer,
  nonFungibleImagePath,
  {
    contentType: "image/png",
  }
);
const [nonFungibleImage] = await umi.uploader.upload([nonFungibleImageFile]);

// Upload non-fungible metadata to Irys
const nonFungibleUri = await umi.uploader.uploadJson({
  name: "No Fungible",
  symbol: "NFUNG",
  description: "Este es mi segundo no fungible de Metaplex",
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
  }`
);
```

Note: The `createNft` method makes all the calls we manually did in the previous episode, these helpers orchestrate calls to createV1, mintV1 and so on depending on the token standard used.

## Step #2: Create a fungible

A fungible token is a token in which you can't differentiate one from the another one. 2 USDCs are identical to each other, while each NFT (non-fungible) is distinct from each other.

```ts
// Upload fungible image to Irys
const fungibleImagePath = path.join(
  __dirname,
  "../assets",
  "fungible-image.png"
);
const fungibleImageBuffer = await readFile(fungibleImagePath);
const fungibleImageFile = createGenericFile(
  fungibleImageBuffer,
  fungibleImagePath,
  {
    contentType: "image/png",
  }
);
const [fungibleImage] = await umi.uploader.upload([fungibleImageFile]);

// Upload fungible metadata to Irys
const fungibleUri = await umi.uploader.uploadJson({
  name: "Fungible",
  symbol: "FUNG",
  description: "Este es mi primer fungible de Metaplex",
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
  }`
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
      createFungibleAssociatedTokenAccountSignature.signature
    )[0]
  }`
);

// Mint the NFT to a wallet
const mintFungibleSignature = await mintV1(umi, {
  mint: fungibleMintSigner.publicKey,
  authority: umi.identity,
  amount: 1,
  tokenOwner: publicKey("8r8dZAgfEicf6KXoSC5xV64S4Wm2RWpq8kfaxKxKJThP"),
  tokenStandard: TokenStandard.NonFungible,
}).sendAndConfirm(umi);
console.log(
  `Mint fungible signature: ${
    base58.deserialize(mintFungibleSignature.signature)[0]
  }`
);
```

Note: For the fungible branch of tokens we have to manually create the ATA and mint, this is because fungible tokens aren't usually owned by a single party.

## Step #3: Create a fungible asset

The fungible asset is pretty similar to the fungible, but with a small difference that it contains attributes in the off-chain data. Meaning that these type of fungible tokens have additional context.

```ts
// Upload fungible asset image to Irys
const fungibleAssetImagePath = path.join(
  __dirname,
  "../assets",
  "fungible-asset-image.png"
);
const fungibleAssetImageBuffer = await readFile(fungibleAssetImagePath);
const fungibleAssetImageFile = createGenericFile(
  fungibleAssetImageBuffer,
  fungibleAssetImagePath,
  {
    contentType: "image/png",
  }
);
const [fungibleAssetImage] = await umi.uploader.upload([
  fungibleAssetImageFile,
]);

// Upload fungible asset metadata to Irys
const fungibleAssetUri = await umi.uploader.uploadJson({
  name: "Asset Fungible",
  symbol: "FUNGA",
  description: "Este es mi primer asset fungible de Metaplex",
  image: fungibleAssetImage,
  attributes: [{ trait_type: "Es un asset", value: "SI" }],
});

// Create the fungible asset on-chain
const fungibleAssetMintSigner = generateSigner(umi);
const createFungibleAssetSignature = await createFungibleAsset(umi, {
  mint: fungibleAssetMintSigner,
  name: "Mi asset fungible",
  uri: fungibleAssetUri,
  sellerFeeBasisPoints: percentAmount(0),
  decimals: some(6),
}).sendAndConfirm(umi);
console.log(
  `Create fungible asset signature: ${
    base58.deserialize(createFungibleAssetSignature.signature)[0]
  }`
);

// Create ATA of the receiver of the fungible asset
const createFungibleAssetAssociatedTokenAccountSignature =
  await createTokenIfMissing(umi, {
    mint: fungibleAssetMintSigner.publicKey,
    owner: publicKey("8r8dZAgfEicf6KXoSC5xV64S4Wm2RWpq8kfaxKxKJThP"),
    ataProgram: getSplAssociatedTokenProgramId(umi),
  }).sendAndConfirm(umi);
console.log(
  `Create fungible asset ATA signature: ${
    base58.deserialize(
      createFungibleAssetAssociatedTokenAccountSignature.signature
    )[0]
  }`
);

// Mint the fungible asset to a wallet
const mintFungibleAssetSignature = await mintV1(umi, {
  mint: fungibleAssetMintSigner.publicKey,
  authority: umi.identity,
  amount: 1,
  tokenOwner: publicKey("8r8dZAgfEicf6KXoSC5xV64S4Wm2RWpq8kfaxKxKJThP"),
  tokenStandard: TokenStandard.FungibleAsset,
}).sendAndConfirm(umi);
console.log(
  `Mint fungible asset signature: ${
    base58.deserialize(mintFungibleAssetSignature.signature)[0]
  }`
);
```

## Step #4: Create a programmable non fungible

By making an NFT programmable (pNFT) we can add additional logic to control how the underlying NFT behaves. A traditional NFT can be freely transferred, burnt and all the standard operations from the SPL Token Program. A pNFT unlike a traditional NFT has the ability to define Rules for all the operations associated to it.

What Metaplex does is that it keeps the underlying token frozen, and for each operation it thaws, executes the operation and then freezes it again. This ensures the operations associated to a pNFT follow certain on-chain logic.

Let's create a pNFT ourselves:

```ts
// Upload programmable non-fungible image to Irys
const programmableNonFungibleImagePath = path.join(
  __dirname,
  "../assets",
  "programmable-non-fungible-image.png"
);
const programmableNonFungibleImageBuffer = await readFile(
  programmableNonFungibleImagePath
);
const programmableNonFungibleImageFile = createGenericFile(
  programmableNonFungibleImageBuffer,
  programmableNonFungibleImagePath,
  {
    contentType: "image/png",
  }
);
const [programmableNonFungibleImage] = await umi.uploader.upload([
  programmableNonFungibleImageFile,
]);

// Upload programmable non-fungible metadata to Irys
const programmableNonFungibleUri = await umi.uploader.uploadJson({
  name: "No Fungible Programable",
  symbol: "PNFUNG",
  description: "Este es mi primer no fungible programable de Metaplex",
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
  }
).sendAndConfirm(umi);
console.log(
  `Create programmable non-fungible signature: ${
    base58.deserialize(createProgrammableNonFungibleSignature.signature)[0]
  }`
);
```

## Bonus: Why programmable NFts?

By having additional rules associated to an NFT we are essentially given super powers to an NFT. The top use-case for them is for royalty enforcement, which is something that cannot be done in the traditional world but thanks to decentralized programs this can be done.

Artists can sell their art and get life-time royalties from resellers, this makes it more attractive for artists than traditional alternatives.
