import type { RunNpm } from './npm-runner.cjs';

export function prepareDesktopRelease(options: {
  clientRoot: string;
  version: string;
  channel: string;
  runNpm: RunNpm;
}): void;
