# Episode #3

The Candy Machine is the gold standard for minting and distributing NFTs in a fair way. The concept behind it is that you interact with the program by pulling a crank that gives you a random item (NFT) and it comes with batteries included.

The benefits from using the Candy Machine are vast:

- Minimal storage costs by leveraging heuristics.
- Customizable minting experiences via the Candy Guard program (will explore further in a future episode)
- Hide and reveal experiences for minters.

In this episode we'll focus on creating and configuring a Candy Machine and then proceed to mint some NFTs with it.

## Initialize your workspace

Before we start, there's some things that need configuration, luckily for us it's pretty much the same from the previous episodes. You need to copy the code from step #1.

## Step #1: Upload image and metadata of all items

Our Candy Machine needs all off-chain data to be loaded before hand, so we'll start there. This works very similarly to previous episodes but this time we'll do it for 3 separate items.

```ts
// Upload image
// Upload metadata
```

Repeat this process for the 3 items available.

## Step #2: Create a Collection NFT

Each Candy Machine must be assocaited with a Metaplex Certified Collection. This special kind of NFT lets you group NFTs together and enables verification to check if an NFT is legitimate.

```ts
// Upload collection image
// Upload collection metadata
// Create a collection NFT
```

## Step #3: Create a Candy Machine on-chain

Now that we have all our requirements ready, it's time to create the Candy Machine. The Candy Machine allows us to configure how the items are loaded:

- Config Line Settings: For standard minting process.
- Hidden Settings: For hide-and-reveal experiences.

Note: We'll stick to Config Line Settings during this episode.

```ts
// Define the Candy Machine settings
// Add a guard for SOL payment of 0.001 SOL
// Create the Candy Machine on-chain
// Load items into the Candy Machine
```

## Step #4: Minting the NFTs from the Candy Machine

At this moment everything is ready to use, our Candy Machine is created and configured, items have been loaded and their images/metadata has been uploaded off-chain. It's now the time for minters to pull the crank and get an NFT.

```ts
// Mint every NFT in the Candy Machine
```

## Bonus: Reveal experience

Modern reveal experiences when minting are powered by Metaplex too, and it's very easy to achieve. Instead of using `Config Line Settings` we have to use `Hidden Settings`. And the approach is to mint all NFTs with a placeholder image/metadata and once all NFTs have been minted, the creator handles the reveal experience.

The reveal experience can differ from creator to creator, some examples are:

- The creator runs a script that automatically reveals all NFTs.
- The creator has an app where NFT owners can go and have a live reveal experience.

Note: Remember that the authority of the Candy Machine is the one doing the reveal.