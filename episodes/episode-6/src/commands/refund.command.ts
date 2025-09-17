export interface RefundCommandOptions {
  campaignAssetAddress: string;
  backerKeypair: string;
  rpcUrl: string;
  serverKeypair: string;
  logLevel: string;
}

export function refundCommand(options: RefundCommandOptions) {
  console.log(options);
}
