import {
  create as createCoreNft,
  fetchAsset,
} from "@metaplex-foundation/mpl-core";
import { createGenericFile, generateSigner } from "@metaplex-foundation/umi";
import { base58 } from "@metaplex-foundation/umi/serializers";
import { getUnixTime, parseISO } from "date-fns";
import { readFile } from "fs/promises";
import path from "path";
import { calculatePaymentOrders, getUmi } from "../utils";

export interface CreateCampaignCommandOptions {
  goal: string;
  durationMonths: string;
  name: string;
  description: string;
  creatorWallet: string;
  projectStartDate: string;
  basePrice: string;
  bondingSlope: string;
  baseUnit: string;
  rpcUrl: string;
  serverKeypair: string;
  logLevel: string;
}

export async function createCampaignCommand(
  options: CreateCampaignCommandOptions
) {
  // Initialize UMI
  const umi = await getUmi(options.serverKeypair);

  // Upload campaign image
  const campaignImagePath = path.join(
    __dirname,
    "../../assets",
    "campaign-image.png"
  );
  const campaignImageBuffer = await readFile(campaignImagePath);
  const campaignImageFile = createGenericFile(
    campaignImageBuffer,
    campaignImagePath,
    {
      contentType: "image/png",
    }
  );
  const [campaignImage] = await umi.uploader.upload([campaignImageFile]);

  // Upload campaign metadata
  const campaignUri = await umi.uploader.uploadJson({
    name: options.name,
    symbol: "CAMP",
    description: options.description,
    image: campaignImage,
    attributes: [
      { trait_type: "goal", value: options.goal },
      { trait_type: "durationMonths", value: options.durationMonths },
      { trait_type: "creatorWallet", value: options.creatorWallet },
      { trait_type: "basePrice", value: options.basePrice },
      { trait_type: "baseUnit", value: options.baseUnit },
      {
        trait_type: "projectStartDate",
        value: getUnixTime(parseISO(options.projectStartDate)).toString(),
      },
    ],
  });

  // Calculate additional fields
  const goal = parseInt(options.goal, 10);
  const durationMonths = parseInt(options.durationMonths, 10);
  const projectStartDate = parseISO(options.projectStartDate);
  const paymentOrders = calculatePaymentOrders(
    durationMonths,
    goal,
    projectStartDate
  );

  // Create a Campaign NFT using Core
  const assetSigner = generateSigner(umi);
  const createCampaignSignature = await createCoreNft(umi, {
    asset: assetSigner,
    name: options.name,
    uri: campaignUri,
    owner: umi.identity.publicKey,
    plugins: [
      {
        type: "Attributes",
        attributeList: [
          { key: "Total pledges", value: "0" },
          { key: "Refunded pledges", value: "0" },
          ...paymentOrders.map((paymentOrder, index) => ({
            key: `Payment Order #${index + 1}`,
            value: paymentOrder.status,
          })),
        ],
      },
    ],
  }).sendAndConfirm(umi);
  console.log(
    `Create Campaign NFT signature: ${
      base58.deserialize(createCampaignSignature.signature)[0]
    }`
  );

  // Fetch the NFT
  const asset = await fetchAsset(umi, assetSigner.publicKey, {
    skipDerivePlugins: false,
  });

  // Print everything we created
  console.log("\nResults:");
  console.log(`Asset Address: ${assetSigner.publicKey}`);
  console.log(`Asset Name: ${asset.name}`);
  console.log(`Asset Attributes:`);
  asset.attributes?.attributeList.forEach((attribute) =>
    console.log(`  ${attribute.key}: ${attribute.value}`)
  );
}
