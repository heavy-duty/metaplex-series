export interface WithdrawCommandOptions {
  campaignAssetAddress: string;
  creatorKeypair: string;
  rpcUrl: string;
  serverKeypair: string;
  logLevel: string;
}

export function withdrawCommand(options: WithdrawCommandOptions) {
  console.log(options);
}
