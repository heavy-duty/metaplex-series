import { create as createCoreNft } from "@metaplex-foundation/mpl-core";
import { generateSigner } from "@metaplex-foundation/umi";
import { base58 } from "@metaplex-foundation/umi/serializers";
import { getUnixTime, parseISO } from "date-fns";
import path from "path";
import {
  calculatePaymentOrders,
  getUmi,
  readKeypairFromFile,
  uploadImage,
} from "../utils";

export interface CreateCampaignCommandOptions {
  goal: string;
  durationMonths: string;
  name: string;
  description: string;
  symbol: string;
  creatorKeypair: string;
  projectStartDate: string;
  basePrice: string;
  bondingSlope: string;
  rpcUrl: string;
  serverKeypair: string;
  logLevel: string;
}

export async function createCampaignCommand(
  options: CreateCampaignCommandOptions,
) {
  // Initialize UMI
  const umi = await getUmi(options.serverKeypair);

  // Read the creator keypair
  const creatorKeypair = await readKeypairFromFile(umi, options.creatorKeypair);

  // Upload campaign image
  const campaignImage = await uploadImage(
    umi,
    path.join(__dirname, "../../assets", "campaign-image.png"),
  );

  // Upload campaign metadata
  const campaignUri = await umi.uploader.uploadJson({
    name: options.name,
    symbol: options.symbol,
    description: options.description,
    image: campaignImage,
    attributes: [
      { trait_type: "goal", value: options.goal },
      { trait_type: "durationMonths", value: options.durationMonths },
      { trait_type: "creatorWallet", value: creatorKeypair.publicKey },
      { trait_type: "basePrice", value: options.basePrice },
      { trait_type: "bondingSlope", value: options.bondingSlope },
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
    projectStartDate,
  );

  // Create a Campaign NFT using Core
  const campaignSigner = generateSigner(umi);
  const createCampaignSignature = await createCoreNft(umi, {
    asset: campaignSigner,
    name: options.name,
    uri: campaignUri,
    owner: umi.identity.publicKey,
    plugins: [
      {
        type: "Attributes",
        attributeList: [
          { key: "status", value: "draft" },
          { key: "totalPledges", value: "0" },
          { key: "refundedPledges", value: "0" },
          { key: "totalDeposited", value: "0" },
          { key: "currentlyDeposited", value: "0" },
          ...paymentOrders.map((paymentOrder) => ({
            key: `paymentOrder_${paymentOrder.orderNumber}`,
            value: paymentOrder.status,
          })),
        ],
      },
    ],
  }).sendAndConfirm(umi);
  console.log(
    `Create Campaign NFT (address: ${campaignSigner.publicKey}) signature: ${
      base58.deserialize(createCampaignSignature.signature)[0]
    }`,
  );
}
