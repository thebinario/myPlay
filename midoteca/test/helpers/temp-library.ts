import { randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

export interface TempLibrary {
  root: string;
  cleanup(): void;
  mkdir(relative: string): string;
  write(relative: string, content?: string, mtime?: Date): string;
  symlink(target: string, linkRelative: string): string;
}

/** Builds an isolated, disposable media tree for scanner/indexer tests. */
export function createTempLibrary(): TempLibrary {
  const root = mkdtempSync(join(tmpdir(), 'midoteca-lib-'));
  return {
    root,
    cleanup() {
      rmSync(root, { recursive: true, force: true });
    },
    mkdir(relative: string) {
      const absolute = join(root, relative);
      mkdirSync(absolute, { recursive: true });
      return absolute;
    },
    write(relative: string, content = `content-${randomUUID()}`, mtime?: Date) {
      const absolute = join(root, relative);
      mkdirSync(dirname(absolute), { recursive: true });
      writeFileSync(absolute, content);
      if (mtime) utimesSync(absolute, mtime, mtime);
      return absolute;
    },
    symlink(target: string, linkRelative: string) {
      const absolute = join(root, linkRelative);
      mkdirSync(dirname(absolute), { recursive: true });
      symlinkSync(target, absolute);
      return absolute;
    },
  };
}
