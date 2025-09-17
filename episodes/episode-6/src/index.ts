import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

import { Command } from "commander";
import {
  createCampaignCommand,
  donateCommand,
  initializeCampaignCommand,
  refundCommand,
  statusCommand,
  withdrawCommand,
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
    process.env.RPC_URL || "https://api.devnet.solana.com"
  )
  .option(
    "--serverKeypair <path>",
    "Server keypair path",
    process.env.SERVER_KEYPAIR_PATH || "./server-keypair.json"
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
  .requiredOption("--creatorWallet <pubkey>", "Creator's wallet public key")
  .requiredOption(
    "--projectStartDate <timestamp>",
    "Project start timestamp (Unix)"
  )
  .option(
    "--basePrice <lamports>",
    "Initial price in lamports",
    process.env.BASE_PRICE || "100000000"
  )
  .option(
    "--bondingSlope <lamports>",
    "Bonding curve slope",
    process.env.BONDING_SLOPE || "10000000"
  )
  .option(
    "--baseUnit <lamports>",
    "Lamports per NFT",
    process.env.BASE_UNIT || "1000000000"
  )
  .action(createCommand(createCampaignCommand));

// Command: initialize-campaign
program
  .command("initialize-campaign")
  .description("Sets up pledges Candy Machine and updates Campaign NFT status")
  .requiredOption("--name <string>", "Campaign name")
  .requiredOption("--symbol <string>", "Campaign symbol")
  .requiredOption("--description <string>", "Campaign description")
  .requiredOption(
    "--campaignAssetAddress <string>",
    "Address of the Campaign NFT"
  )
  .action(createCommand(initializeCampaignCommand));

// Command: status
program
  .command("status")
  .description("Queries campaign status")
  .requiredOption(
    "--campaignAssetAddress <pubkey>",
    "Address of the Campaign NFT"
  )
  .action(createCommand(statusCommand));

// Command: donate
program
  .command("donate")
  .description("Mints Pledge NFTs, transfers SOL to Campaign NFT's account")
  .requiredOption(
    "--campaignAssetAddress <string>",
    "Address of the Campaign NFT"
  )
  .requiredOption("--backerKeypair <path>", "Backer's keypair path")
  .requiredOption("--amount <lamports>", "Donation amount in lamports")
  .action(createCommand(donateCommand));

// Command: refund
program
  .command("refund")
  .description("Burns backer's Pledge NFTs, refunds total pledged amount")
  .requiredOption(
    "--campaignAssetAddress <string>",
    "Address of the Campaign NFT"
  )
  .requiredOption("--backerKeypair <path>", "Backer's keypair path")
  .action(createCommand(refundCommand));

// Command: withdraw
program
  .command("withdraw")
  .description("Batch-claims eligible payment orders post-projectStartDate")
  .requiredOption(
    "--campaignAssetAddress <string>",
    "Address of the Campaign NFT"
  )
  .requiredOption("--creatorKeypair <path>", "Creator's keypair path")
  .action(createCommand(withdrawCommand));

// Parse command-line arguments
program.parse(process.argv);
