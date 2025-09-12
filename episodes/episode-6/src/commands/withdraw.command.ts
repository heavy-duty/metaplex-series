export interface WithdrawCommandOptions {
  campaignMint: string;
  partial: boolean;
  rpcUrl: string;
  serverKeypair: string;
  logLevel: string;
}

export function withdrawCommand(options: {
  campaignMint: string;
  partial: boolean;
  rpcUrl: string;
  serverKeypair: string;
  logLevel: string;
}) {
  console.log(options);
}
