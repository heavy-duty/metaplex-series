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

export function createCampaignCommand(options: CreateCampaignCommandOptions) {
  console.log(options);
}
