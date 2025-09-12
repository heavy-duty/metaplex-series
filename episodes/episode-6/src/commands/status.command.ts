import { fetchAsset } from "@metaplex-foundation/mpl-core";
import { publicKey } from "@metaplex-foundation/umi";
import { getUmi } from "../utils";

export interface StatusCommandOptions {
  campaignAssetAddress: string;
  rpcUrl: string;
  serverKeypair: string;
  logLevel: string;
}

export async function statusCommand(options: StatusCommandOptions) {
  // Initialize UMI
  const umi = await getUmi(options.serverKeypair);

  // Fetch the NFT
  const asset = await fetchAsset(umi, publicKey(options.campaignAssetAddress), {
    skipDerivePlugins: false,
  });

  // Fetch the metadata
  const response = await fetch(asset.uri, { method: "GET" });

  if (!response.ok) {
    throw new Error("Metadata not found");
  }

  const metadata = await response.json();

  // Print everything we created
  console.log("\nResults:");
  console.log(`Asset Address: ${options.campaignAssetAddress}`);
  console.log(`Asset Name: ${asset.name} ($${metadata.symbol})`);
  console.log(`Asset Description: ${metadata.description}`);
  console.log(`Asset Attributes: (on-chain)`);
  asset.attributes?.attributeList.forEach((attribute) =>
    console.log(`  ${attribute.key}: ${attribute.value}`)
  );
  console.log(`Asset Attributes: (off-chain)`);
  metadata.attributes.forEach(
    (attribute: { trait_type: string; value: string }) =>
      console.log(`  ${attribute.trait_type}: ${attribute.value}`)
  );
}
