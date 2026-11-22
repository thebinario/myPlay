export type RunNpm = (args: string[], cwd: string, capture?: boolean) => string | null;

export function createNpmRunner(options?: { execPath?: string; npmCli?: string }): RunNpm;
