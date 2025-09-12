export interface ListCampaignsCommandOptions {
  rpcUrl: string;
  serverKeypair: string;
  logLevel: string;
}

export function listCampaignsCommand(options: ListCampaignsCommandOptions) {
  console.log(options);
}
