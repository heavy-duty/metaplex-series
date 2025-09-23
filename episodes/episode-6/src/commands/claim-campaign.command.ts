import { fetchAssetV1 } from "@metaplex-foundation/mpl-core";
import { mintV1 } from "@metaplex-foundation/mpl-core-candy-machine";
import { setComputeUnitLimit } from "@metaplex-foundation/mpl-toolbox";
import {
  generateSigner,
  publicKey,
  some,
  transactionBuilder,
} from "@metaplex-foundation/umi";
import { base58 } from "@metaplex-foundation/umi/serializers";
import {
  fetchAssetWithMetadata,
  getUmi,
  readKeypairFromFile,
  toCampaign,
} from "../utils";

export interface ClaimCampaignCommandOptions {
  campaignAssetAddress: string;
  pledgeAssetAddress: string;
  backerKeypair: string;
  rpcUrl: string;
  serverKeypair: string;
  logLevel: string;
}

export async function claimCampaignCommand(
  options: ClaimCampaignCommandOptions,
) {
  // Initialize UMI
  const umi = await getUmi(options.serverKeypair);

  // Read the backer keypair
  const backerKeypair = await readKeypairFromFile(umi, options.backerKeypair);

  // Fetch the campaign asset with its metadata
  const campaignAssetWithMetadata = await fetchAssetWithMetadata({
    serverKeypair: options.serverKeypair,
    campaignAssetAddress: options.campaignAssetAddress,
  });
  const campaign = toCampaign(campaignAssetWithMetadata);

  // Fetch the pledge nft
  const pledgeAsset = await fetchAssetV1(
    umi,
    publicKey(options.pledgeAssetAddress),
  );

  if (pledgeAsset.owner !== backerKeypair.publicKey) {
    throw new Error("You are not authorized to claim with this pledge");
  }

  if (!campaign.pledgesCollectionAddress) {
    throw new Error("Pledges collection address not defined");
  }

  if (!campaign.rewardsCollectionAddress) {
    throw new Error("Rewards collection address not defined");
  }

  if (!campaign.rewardsCandyMachineAddress) {
    throw new Error("Rewards candy machine address not defined");
  }

  // Mint a reward nft from the candy machine by burning the pledge nft
  const mintSigner = generateSigner(umi);
  const mintSignature = await transactionBuilder()
    .add(setComputeUnitLimit(umi, { units: 800_000 }))
    .add(
      mintV1(umi, {
        candyMachine: publicKey(campaign.rewardsCandyMachineAddress),
        asset: mintSigner,
        collection: publicKey(campaign.rewardsCollectionAddress),
        mintArgs: {
          assetBurn: some({
            requiredCollection: publicKey(campaign.pledgesCollectionAddress),
            asset: publicKey(options.pledgeAssetAddress),
          }),
        },
      }),
    )
    .sendAndConfirm(umi);
  console.log(
    `Mint signature: ${base58.deserialize(mintSignature.signature)[0]}`,
  );
}
