import { fetchAssetsByCollection } from "@metaplex-foundation/mpl-core";
import { publicKey } from "@metaplex-foundation/umi";
import {
  fetchAssetWithMetadata,
  getUmi,
  readKeypairFromFile,
  toCampaign,
} from "../utils";

export interface CampaignRewardsCommandOptions {
  campaignAssetAddress: string;
  backerKeypair: string;
  rpcUrl: string;
  serverKeypair: string;
  logLevel: string;
}

export async function campaignRewardsCommand(
  options: CampaignRewardsCommandOptions,
) {
  // Initialize UMI
  const umi = await getUmi(options.serverKeypair);

  // Fetch the asset with metadata
  const campaignAssetWithMetadata = await fetchAssetWithMetadata({
    campaignAssetAddress: options.campaignAssetAddress,
    serverKeypair: options.serverKeypair,
  });

  // Transform asset with metadata into campaign
  const campaign = toCampaign(campaignAssetWithMetadata);

  if (!campaign.rewardsCollectionAddress) {
    throw new Error("Campaign has no rewards collection address.");
  }

  const rewardNfts = await fetchAssetsByCollection(
    umi,
    publicKey(campaign.rewardsCollectionAddress),
  );
  const backerKeypair = await readKeypairFromFile(umi, options.backerKeypair);
  const myRewardNfts = rewardNfts.filter(
    (rewardNft) => rewardNft.owner === backerKeypair.publicKey,
  );

  myRewardNfts.forEach((rewardNft) => {
    console.log(` - ${rewardNft.name}: ${rewardNft.publicKey}`);
  });
}
