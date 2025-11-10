import { AssetWithMetadata } from "./fetch-asset-with-metadata";

export type CampaignStatus =
  | "draft"
  | "active"
  | "work in progress"
  | "finalized";

export type PaymentOrderStatus = "unclaimed" | "claimed";

export interface BaseCampaign {
  address: string;
  name: string;
  description: string;
  symbol: string;
  creatorWallet: string;
  goal: number;
  status: CampaignStatus;
  totalPledges: number;
  refundedPledges: number;
}

export type Campaign = BaseCampaign &
  (
    | { status: "draft" }
    | { status: "active"; pledgesCollectionAddress: string }
    | {
        status: "work in progress";
        pledgesCollectionAddress: string;
        rewardsCollectionAddress: string;
      }
    | {
        status: "finalized";
        pledgesCollectionAddress: string;
        rewardsCollectionAddress: string;
        rewardsCandyMachineAddress: string;
      }
  );

export function toCampaign(assetWithMetadata: AssetWithMetadata): Campaign {
  const campaignGoal =
    assetWithMetadata.metadata.attributes.find(
      (attribute) => attribute.trait_type === "goal",
    )?.value || null;

  if (campaignGoal === null) {
    throw new Error("Campaign is missing goal");
  }

  const campaignCreatorWallet =
    assetWithMetadata.metadata.attributes.find(
      (attribute) => attribute.trait_type === "creatorWallet",
    )?.value || null;

  if (campaignCreatorWallet === null) {
    throw new Error("Campaign is missing creatorWallet");
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
    campaignStatus !== "work in progress" &&
    campaignStatus !== "finalized"
  ) {
    throw new Error("Campaign status is invalid");
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

  if (campaignStatus === "draft") {
    return {
      address: assetWithMetadata.publicKey,
      name: assetWithMetadata.name,
      description: assetWithMetadata.metadata.description,
      symbol: assetWithMetadata.metadata.symbol,
      goal: parseInt(campaignGoal, 10),
      creatorWallet: campaignCreatorWallet,
      totalPledges: parseInt(campaignTotalPledges, 10),
      refundedPledges: parseInt(campaignRefundedPledges, 10),
      status: "draft",
    };
  } else if (campaignStatus === "active") {
    if (!campaignPledgesCollectionAddress) {
      throw new Error("Campaign is missing the pledges collection address");
    }

    return {
      address: assetWithMetadata.publicKey,
      name: assetWithMetadata.name,
      description: assetWithMetadata.metadata.description,
      symbol: assetWithMetadata.metadata.symbol,
      goal: parseInt(campaignGoal, 10),
      creatorWallet: campaignCreatorWallet,
      totalPledges: parseInt(campaignTotalPledges, 10),
      refundedPledges: parseInt(campaignRefundedPledges, 10),
      status: "active",
      pledgesCollectionAddress: campaignPledgesCollectionAddress,
    };
  } else if (campaignStatus === "work in progress") {
    if (!campaignPledgesCollectionAddress) {
      throw new Error("Campaign is missing the pledges collection address");
    }

    if (!campaignRewardsCollectionAddress) {
      throw new Error("Campaign is missing the rewards collection address");
    }

    return {
      address: assetWithMetadata.publicKey,
      name: assetWithMetadata.name,
      description: assetWithMetadata.metadata.description,
      symbol: assetWithMetadata.metadata.symbol,
      goal: parseInt(campaignGoal, 10),
      creatorWallet: campaignCreatorWallet,
      totalPledges: parseInt(campaignTotalPledges, 10),
      refundedPledges: parseInt(campaignRefundedPledges, 10),
      status: "work in progress",
      pledgesCollectionAddress: campaignPledgesCollectionAddress,
      rewardsCollectionAddress: campaignRewardsCollectionAddress,
    };
  } else if (campaignStatus === "finalized") {
    if (!campaignPledgesCollectionAddress) {
      throw new Error("Campaign is missing the pledges collection address");
    }

    if (!campaignRewardsCollectionAddress) {
      throw new Error("Campaign is missing the rewards collection address");
    }

    if (!campaignRewardsCandyMachineAddress) {
      throw new Error("Campaign is missing the rewards candy machine address");
    }

    return {
      address: assetWithMetadata.publicKey,
      name: assetWithMetadata.name,
      description: assetWithMetadata.metadata.description,
      symbol: assetWithMetadata.metadata.symbol,
      goal: parseInt(campaignGoal, 10),
      creatorWallet: campaignCreatorWallet,
      totalPledges: parseInt(campaignTotalPledges, 10),
      refundedPledges: parseInt(campaignRefundedPledges, 10),
      status: "finalized",
      pledgesCollectionAddress: campaignPledgesCollectionAddress,
      rewardsCollectionAddress: campaignRewardsCollectionAddress,
      rewardsCandyMachineAddress: campaignRewardsCandyMachineAddress,
    };
  } else {
    throw new Error("Invalid campaign status");
  }
}
