export interface DonateCommandOptions {
  campaignMint: string;
  backerWallet: string;
  amount: string;
  rpcUrl: string;
  serverKeypair: string;
  logLevel: string;
}

export function donateCommand(options: DonateCommandOptions) {
  console.log(options);
}
