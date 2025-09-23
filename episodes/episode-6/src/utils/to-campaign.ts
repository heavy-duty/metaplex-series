import { AssetWithMetadata } from "./fetch-asset-with-metadata";

export type CampaignStatus = "draft" | "active" | "finalized";

export type PaymentOrderStatus = "unclaimed" | "claimed";

export interface Campaign {
  address: string;
  name: string;
  description: string;
  symbol: string;
  durationMonths: number;
  creatorWallet: string;
  projectStartDate: Date;
  goal: number;
  basePrice: number;
  bondingSlope: number;
  status: CampaignStatus;
  totalPledges: number;
  refundedPledges: number;
  totalDeposited: number;
  currentlyDeposited: number;
  paymentOrders: { orderNumber: number; status: PaymentOrderStatus }[];
  pledgesCollectionAddress: string | null;
  rewardsCollectionAddress: string | null;
  rewardsCandyMachineAddress: string | null;
}

export function toCampaign(assetWithMetadata: AssetWithMetadata): Campaign {
  const campaignGoal =
    assetWithMetadata.metadata.attributes.find(
      (attribute) => attribute.trait_type === "goal",
    )?.value || null;

  if (campaignGoal === null) {
    throw new Error("Campaign is missing goal");
  }

  const campaignBasePrice =
    assetWithMetadata.metadata.attributes.find(
      (attribute) => attribute.trait_type === "basePrice",
    )?.value || null;

  if (campaignBasePrice === null) {
    throw new Error("Campaign is missing basePrice");
  }

  const campaignBondingSlope =
    assetWithMetadata.metadata.attributes.find(
      (attribute) => attribute.trait_type === "bondingSlope",
    )?.value || null;

  if (campaignBondingSlope === null) {
    throw new Error("Campaign is missing bondingSlope");
  }

  const campaignDurationMonths =
    assetWithMetadata.metadata.attributes.find(
      (attribute) => attribute.trait_type === "durationMonths",
    )?.value || null;

  if (campaignDurationMonths === null) {
    throw new Error("Campaign is missing durationMonths");
  }

  const campaignCreatorWallet =
    assetWithMetadata.metadata.attributes.find(
      (attribute) => attribute.trait_type === "creatorWallet",
    )?.value || null;

  if (campaignCreatorWallet === null) {
    throw new Error("Campaign is missing creatorWallet");
  }

  const campaignProjectStartDate =
    assetWithMetadata.metadata.attributes.find(
      (attribute) => attribute.trait_type === "projectStartDate",
    )?.value || null;

  if (campaignProjectStartDate === null) {
    throw new Error("Campaign is missing projectStartDate");
  }

  const campaignTotalPledges =
    assetWithMetadata.attributes?.attributeList.find(
      (attribute) => attribute.key === "totalPledges",
    )?.value || null;

  if (campaignTotalPledges === null) {
    throw new Error("Campaign is missing totalPledges");
  }

  const campaignRefundedPledges =
    assetWithMetadata.attributes?.attributeList.find(
      (attribute) => attribute.key === "refundedPledges",
    )?.value || null;

  if (campaignRefundedPledges === null) {
    throw new Error("Campaign is missing refundedPledges");
  }

  const campaignTotalDeposited =
    assetWithMetadata.attributes?.attributeList.find(
      (attribute) => attribute.key === "totalDeposited",
    )?.value || null;

  if (campaignTotalDeposited === null) {
    throw new Error("Campaign is missing totalDeposited");
  }

  const campaignCurrentlyDeposited =
    assetWithMetadata.attributes?.attributeList.find(
      (attribute) => attribute.key === "currentlyDeposited",
    )?.value || null;

  if (campaignCurrentlyDeposited === null) {
    throw new Error("Campaign is missing currently deposited");
  }

  const campaignStatus =
    assetWithMetadata.attributes?.attributeList.find(
      (attribute) => attribute.key === "status",
    )?.value || null;

  if (campaignStatus === null) {
    throw new Error("Campaign is missing status");
  }

  if (
    campaignStatus !== "draft" &&
    campaignStatus !== "active" &&
    campaignStatus !== "finalized"
  ) {
    throw new Error("Campaign status is invalid");
  }

  const campaignPaymentOrders =
    assetWithMetadata.attributes?.attributeList.filter((attribute) =>
      attribute.key.includes("paymentOrder"),
    ) || null;

  if (campaignPaymentOrders === null) {
    throw new Error("Campaign is missing payment orders");
  }

  const campaignPledgesCollectionAddress =
    assetWithMetadata.attributes?.attributeList.find(
      (attribute) => attribute.key === "pledgesCollectionAddress",
    )?.value || null;

  const campaignRewardsCollectionAddress =
    assetWithMetadata.attributes?.attributeList.find(
      (attribute) => attribute.key === "rewardsCollectionAddress",
    )?.value || null;

  const campaignRewardsCandyMachineAddress =
    assetWithMetadata.attributes?.attributeList.find(
      (attribute) => attribute.key === "rewardsCandyMachineAddress",
    )?.value || null;

  return {
    address: assetWithMetadata.publicKey,
    name: assetWithMetadata.name,
    description: assetWithMetadata.metadata.description,
    symbol: assetWithMetadata.metadata.symbol,
    goal: parseInt(campaignGoal, 10),
    basePrice: parseInt(campaignBasePrice, 10),
    bondingSlope: parseInt(campaignBondingSlope, 10),
    durationMonths: parseInt(campaignDurationMonths, 10),
    creatorWallet: campaignCreatorWallet,
    projectStartDate: new Date(parseInt(campaignProjectStartDate, 10) * 1000),
    totalPledges: parseInt(campaignTotalPledges, 10),
    refundedPledges: parseInt(campaignRefundedPledges, 10),
    totalDeposited: parseInt(campaignTotalDeposited, 10),
    currentlyDeposited: parseInt(campaignCurrentlyDeposited, 10),
    status: campaignStatus,
    paymentOrders: campaignPaymentOrders.map((attribute) => {
      const orderNumber = attribute.key.split("_")[1];
      return {
        orderNumber: parseInt(orderNumber, 10),
        status: attribute.value as PaymentOrderStatus,
      };
    }),
    pledgesCollectionAddress: campaignPledgesCollectionAddress,
    rewardsCollectionAddress: campaignRewardsCollectionAddress,
    rewardsCandyMachineAddress: campaignRewardsCandyMachineAddress,
  };
}
