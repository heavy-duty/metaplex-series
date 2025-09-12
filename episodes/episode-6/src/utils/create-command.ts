import { Command } from "commander";

export interface GlobalOptions {
  rpcUrl: string;
  serverKeypair: string;
  logLevel: string;
}

export function createCommand<T extends {}, U>(
  actionFn: (options: T & GlobalOptions) => U
) {
  return (options: Omit<T, keyof GlobalOptions>, command: Command) => {
    // Get global options
    const globalOptions = command.parent!.opts<{
      rpcUrl: string;
      serverKeypair: string;
      logLevel: string;
    }>();

    actionFn({ ...globalOptions, ...options } as T & GlobalOptions);
  };
}
