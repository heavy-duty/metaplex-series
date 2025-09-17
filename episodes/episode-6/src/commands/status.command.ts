import { fetchAssetWithMetadata, toCampaign } from "../utils";

export interface StatusCommandOptions {
  campaignAssetAddress: string;
  rpcUrl: string;
  serverKeypair: string;
  logLevel: string;
}

export async function statusCommand(options: StatusCommandOptions) {
  // Fetch the asset with metadata
  const campaignAssetWithMetadata = await fetchAssetWithMetadata({
    campaignAssetAddress: options.campaignAssetAddress,
    serverKeypair: options.serverKeypair,
  });

  // Transform asset with metadata into campaign
  const campaign = toCampaign(campaignAssetWithMetadata);

  // Pretty print the campaign and all its details
  console.log(JSON.stringify(campaign, null, "  "));
}
