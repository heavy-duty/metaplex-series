import { fetchAssetsByCollection } from "@metaplex-foundation/mpl-core";
import { publicKey } from "@metaplex-foundation/umi";
import {
  fetchAssetWithMetadata,
  getUmi,
  readKeypairFromFile,
  toCampaign,
} from "../utils";

export interface CampaignPledgesCommandOptions {
  campaignAssetAddress: string;
  backerKeypair: string;
  rpcUrl: string;
  serverKeypair: string;
  logLevel: string;
}

export async function campaignPledgesCommand(
  options: CampaignPledgesCommandOptions,
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

  if (!campaign.pledgesCollectionAddress) {
    throw new Error("Campaign has no pledges collection address.");
  }

  const pledgeNfts = await fetchAssetsByCollection(
    umi,
    publicKey(campaign.pledgesCollectionAddress),
  );
  const backerKeypair = await readKeypairFromFile(umi, options.backerKeypair);
  const myPledgeNfts = pledgeNfts.filter(
    (pledgeNft) => pledgeNft.owner === backerKeypair.publicKey,
  );

  myPledgeNfts.forEach((pledgeNft) => {
    console.log(` - ${pledgeNft.name}: ${pledgeNft.publicKey}.`);
  });
}
