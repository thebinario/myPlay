export interface DevCommand {
  command: string;
  args: string[];
}

export function createDevCommands(options: { root: string; execPath?: string; npmCli?: string }): {
  electron(args: string[]): DevCommand;
  npm(args: string[]): DevCommand;
  vite(args: string[]): DevCommand;
};
