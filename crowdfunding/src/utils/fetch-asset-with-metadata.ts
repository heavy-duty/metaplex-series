import { AssetV1, fetchAsset } from "@metaplex-foundation/mpl-core";
import { publicKey } from "@metaplex-foundation/umi";
import { getUmi } from "../utils";

export interface FetchAssetWithMetadataParams {
  campaignAssetAddress: string;
  serverKeypair: string;
}

export interface AssetMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string;
  attributes: { trait_type: string; value: string }[];
}

export type AssetWithMetadata = AssetV1 & { metadata: AssetMetadata };

export async function fetchAssetWithMetadata(
  params: FetchAssetWithMetadataParams
): Promise<AssetWithMetadata> {
  // Initialize UMI
  const umi = await getUmi(params.serverKeypair);

  // Fetch the asset
  const asset = await fetchAsset(umi, publicKey(params.campaignAssetAddress), {
    skipDerivePlugins: false,
  });

  // Fetch the metadata
  const response = await fetch(asset.uri, { method: "GET" });

  if (!response.ok) {
    throw new Error("Metadata not found");
  }

  const metadata: AssetMetadata = await response.json();

  return { ...asset, metadata };
}
