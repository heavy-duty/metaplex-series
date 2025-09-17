export interface DonateCommandOptions {
  campaignAssetAddress: string;
  backerKeypair: string;
  amount: string;
  rpcUrl: string;
  serverKeypair: string;
  logLevel: string;
}

export function donateCommand(options: DonateCommandOptions) {
  console.log(options);
}
