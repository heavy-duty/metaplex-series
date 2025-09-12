export interface RefundCommandOptions {
  campaignMint: string;
  backerWallet: string;
  rpcUrl: string;
  serverKeypair: string;
  logLevel: string;
}

export function refundCommand(options: RefundCommandOptions) {
  console.log(options);
}
