import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

import { Command } from "commander";
import {
  campaignCommand,
  campaignPledgesCommand,
  campaignRewardsCommand,
  claimCampaignCommand,
  createCampaignCommand,
  finalizeCampaignCommand,
  initializeCampaignCommand,
  pledgeCampaignCommand,
  refundCampaignCommand,
  withdrawCampaignCommand,
} from "./commands";
import { createCommand } from "./utils";

// Initialize commander
const program = new Command();

// Set up global options
program
  .version("3.0.0")
  .description("Solana Crowdfunding CLI Demo with Metaplex Core NFTs")
  .option(
    "--rpcUrl <url>",
    "Solana RPC URL",
    process.env.RPC_URL || "https://api.devnet.solana.com",
  )
  .option(
    "--serverKeypair <path>",
    "Server keypair path",
    process.env.SERVER_KEYPAIR_PATH || "./server-keypair.json",
  )
  .option("--logLevel <level>", "Log level (error|warn|info|debug)", "info");

// Command: create-campaign
program
  .command("create-campaign")
  .description("Mints Campaign NFT")
  .requiredOption("--goal <lamports>", "Funding goal in lamports")
  .requiredOption("--durationMonths <num>", "Duration in months")
  .requiredOption("--name <string>", "Campaign name")
  .requiredOption("--symbol <string>", "Campaign symbol")
  .requiredOption("--description <string>", "Campaign description")
  .requiredOption("--creatorKeypair <path>", "Creator's keypair file path")
  .requiredOption(
    "--projectStartDate <timestamp>",
    "Project start timestamp (Unix)",
  )
  .option(
    "--basePrice <lamports>",
    "Initial price in lamports",
    process.env.BASE_PRICE || "100000000",
  )
  .option(
    "--bondingSlope <lamports>",
    "Bonding curve slope",
    process.env.BONDING_SLOPE || "10000000",
  )
  .action(createCommand(createCampaignCommand));

// Command: initialize-campaign
program
  .command("initialize-campaign")
  .description("Sets up pledges collection and updates Campaign NFT status")
  .requiredOption(
    "--campaignAssetAddress <string>",
    "Address of the Campaign NFT",
  )
  .requiredOption("--creatorKeypair <path>", "Creator's keypair path")
  .action(createCommand(initializeCampaignCommand));

// Command: campaign
program
  .command("campaign")
  .description("Queries campaign data")
  .requiredOption(
    "--campaignAssetAddress <pubkey>",
    "Address of the Campaign NFT",
  )
  .action(createCommand(campaignCommand));

// Command: pledge-campaign
program
  .command("pledge-campaign")
  .description("Mints Pledge NFT, transfers SOL to Campaign NFT's account")
  .requiredOption(
    "--campaignAssetAddress <string>",
    "Address of the Campaign NFT",
  )
  .requiredOption("--backerKeypair <path>", "Backer's keypair path")
  .action(createCommand(pledgeCampaignCommand));

// Command: refund-campaign
program
  .command("refund-campaign")
  .description(
    "Burns backer's Pledge NFT, refunds total pledged amount after slippage",
  )
  .requiredOption(
    "--campaignAssetAddress <string>",
    "Address of the Campaign NFT",
  )
  .requiredOption("--backerKeypair <path>", "Backer's keypair path")
  .requiredOption("--pledgeAssetAddress <string>", "Address of the Pledge NFT")
  .action(createCommand(refundCampaignCommand));

// Command: campaign-pledges
program
  .command("campaign-pledges")
  .description("Queries campaign pledges for the backer")
  .requiredOption(
    "--campaignAssetAddress <string>",
    "Address of the Campaign NFT",
  )
  .requiredOption("--backerKeypair <path>", "Backer's keypair path")
  .action(createCommand(campaignPledgesCommand));

// Command: withdraw-campaign
program
  .command("withdraw-campaign")
  .description("Batch-claims eligible payment orders post-projectStartDate")
  .requiredOption(
    "--campaignAssetAddress <string>",
    "Address of the Campaign NFT",
  )
  .requiredOption("--creatorKeypair <path>", "Creator's keypair path")
  .action(createCommand(withdrawCampaignCommand));

// Command: finalize-campaign
program
  .command("finalize-campaign")
  .description("Sets up rewards Candy Machine and updates Campaign NFT status")
  .requiredOption(
    "--campaignAssetAddress <string>",
    "Address of the Campaign NFT",
  )
  .requiredOption("--creatorKeypair <path>", "Creator's keypair path")
  .action(createCommand(finalizeCampaignCommand));

// Command: claim-campaign
program
  .command("claim-campaign")
  .description("Burn a pledge NFT in exchange of a reward NFT")
  .requiredOption(
    "--campaignAssetAddress <string>",
    "Address of the Campaign NFT",
  )
  .requiredOption("--backerKeypair <path>", "Backer's keypair path")
  .requiredOption("--pledgeAssetAddress <string>", "Address of the Pledge NFT")
  .action(createCommand(claimCampaignCommand));

// Command: campaign-rewards
program
  .command("campaign-rewards")
  .description("Queries campaign rewards for the backer")
  .requiredOption(
    "--campaignAssetAddress <string>",
    "Address of the Campaign NFT",
  )
  .requiredOption("--backerKeypair <path>", "Backer's keypair path")
  .action(createCommand(campaignRewardsCommand));

// Parse command-line arguments
program.parse(process.argv);
