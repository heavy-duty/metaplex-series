export interface StatusCommandOptions {
  campaignMint: string;
  rpcUrl: string;
  serverKeypair: string;
  logLevel: string;
}

export function statusCommand(options: StatusCommandOptions) {
  console.log(options);
}
