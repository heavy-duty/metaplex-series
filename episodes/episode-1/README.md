# Episode #1

The token metadata from Metaplex allows you to give context to a token, the token has information like supply, decimals, but has no concept of "name", "icon", "symbol", etc... The token metadata from metaplex allows us to give a traditional token additional information.

Let's learn you can use this in Typescript.

## Bonus: Setup a keypair in devnet

In order to interact with Metaplex we need a keypair, you'll find below what you need to generate one. We'll be using devnet through the series, you need to make sure the keypair is loaded with SOL.

```ts
// Setup the Solana connection to devnet
const connection = new Connection(clusterApiUrl("devnet"));

// Generate a new keypair and airdrop some SOL to it
const keypair = Keypair.generate();
await connection.requestAirdrop(keypair.publicKey, LAMPORTS_PER_SOL);

// Save the keypair in keypair.json in the root folder of the project
const keypairFilePath = path.join(__dirname, "../..", "keypair.json");
await writeFile(keypairFilePath, keypair.secretKey);
```

Note: There are limitations to airdrops in devnet, it's highly recommended to generate the keypair once, aidrop to it and then store the keypair somewhere accessible (i.e. a JSON file in your project) and then re-use it throughout the series.

**DO NOT STORE YOUR PRIVATE KEY IN A JSON FILE IN PRODUCTION, THIS IS ONLY RECOMMENDED DURING DEVELOPMENT**

## First step: Configure Umi

Umi is the go-to SDK to interact with Metaplex protocols and tools. It hides a lot of the complexities behind it, so it's easy to use for developers.

```ts
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
```

## Second step: Uploading off-chain data

You can use any service to store the off-chain data, for this series we'll use [Irys](https://irys.xyz/) for storage.

```ts
// Register Irys as the uploader
umi = umi.use(
  irysUploader({
    address: "https://devnet.irys.xyz",
  })
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
  name: "Mi primer NFT",
  symbol: "FAM",
  description: "Este es mi primer NFT de Metaplex",
  image,
});
```

## Third step: Creating Mint and Metadata accounts

Once the off-chain data is uploaded and we the URI ready to use it's time to create the Mint (the actual token) and the Metadata (the context of the token) accounts. Umi provides `createV1` for specially this.

```ts
// Create the NFT
const mintSigner = generateSigner(umi);
const createSignature = await createV1(umi, {
  mint: mintSigner,
  name: "Mi NFT",
  uri,
  sellerFeeBasisPoints: percentAmount(0),
  tokenStandard: TokenStandard.NonFungible,
  updateAuthority: umi.identity,
}).sendAndConfirm(umi);
console.log(
  `Create signature: ${base58.deserialize(createSignature.signature)[0]}`
);
```

## Fourth step: Minting tokens

Now that our token is created and it's context is associated to it we can start minting actual tokens. Umi helps us with the `mintV1` method.

```ts
// Create ATA of the receiver
const createAssociatedTokenAccountSignature = await createTokenIfMissing(umi, {
  mint: mintSigner.publicKey,
  owner: publicKey("8r8dZAgfEicf6KXoSC5xV64S4Wm2RWpq8kfaxKxKJThP"),
  ataProgram: getSplAssociatedTokenProgramId(umi),
}).sendAndConfirm(umi);
console.log(
  `Create ATA signature: ${
    base58.deserialize(createAssociatedTokenAccountSignature.signature)[0]
  }`
);

// Mint the token to the receiver
const mintSignature = await mintV1(umi, {
  mint: mintSigner.publicKey,
  authority: umi.identity,
  amount: 1,
  tokenOwner: publicKey("8r8dZAgfEicf6KXoSC5xV64S4Wm2RWpq8kfaxKxKJThP"),
  tokenStandard: TokenStandard.NonFungible,
}).sendAndConfirm(umi);
console.log(
  `Mint signature: ${base58.deserialize(mintSignature.signature)[0]}`
);
```

## Conclusion

And just like that we created our first NFT. As you can see it consists of some external information that it's associated to an on-chain token that allows you to prove ownership over the data. Umi makes the entire process simple.

## Next step

In the next episode we'll explore the types of tokens that can be created with the Token Standard.

Note: We refer here to the old Token Standard, not to be confused with the Digital Asset Standard (DAS).
