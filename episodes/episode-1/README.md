# Episode #1

The token metadata from Metaplex allows you to give context to a token, the token has information like supply, decimals, but has no concept of "name", "icon", "symbol", etc... The token metadata from metaplex allows us to give a traditional token additional information.

Let's learn you can use this in Typescript.

## Bonus: Setup a keypair in devnet

In order to interact with Metaplex we need a keypair, you'll find below what you need to generate one. We'll be using devnet through the series, you need to make sure the keypair is loaded with SOL.

```ts
// Generate a new keypair
// Airdrop to keypair
// Store at root path
```

Note: There are limitations to airdrops in devnet, it's highly recommended to generate the keypair once, aidrop to it and then store the keypair somewhere accessible (i.e. a JSON file in your project) and then re-use it throughout the series.

**DO NOT STORE YOUR PRIVATE KEY IN A JSON FILE IN PRODUCTION, THIS IS ONLY RECOMMENDED DURING DEVELOPMENT**

## First step: Configure Umi

Umi is the go-to SDK to interact with Metaplex protocols and tools. It hides a lot of the complexities behind it, so it's easy to use for developers.

```ts
// Initialize umi
// Create keypair from file
// Register keypair as identity and payer with umi
// Register token metadata program with umi
// Register metaplex toolbox with umi
```

## Second step: Uploading off-chain data

You can use any service to store the off-chain data, for this series we'll use [Irys](https://irys.xyz/) for storage.

```ts
// Register Irys as uploader with umi
// Upload image
// Upload json metadata
```

## Third step: Creating Mint and Metadata accounts

Once the off-chain data is uploaded and we the URI ready to use it's time to create the Mint (the actual token) and the Metadata (the context of the token) accounts. Umi provides `createV1` for specially this.

```ts
// Create the mint and metadata accounts
```

## Fourth step: Minting tokens

Now that our token is created and it's context is associated to it we can start minting actual tokens. Umi helps us with the `mintV1` method.

```ts
// Create receiver ATA
// Mint the token to the receiver
```

## Conclusion

And just like that we created our first NFT. As you can see it consists of some external information that it's associated to an on-chain token that allows you to prove ownership over the data. Umi makes the entire process simple.

## Next step

In the next episode we'll explore the types of tokens that can be created with the Token Standard.

Note that we refer here to the old Token Standard, not to be confused with the Digital Asset Standard (DAS).
