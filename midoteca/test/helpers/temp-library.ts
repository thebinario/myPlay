import { randomUUID } from 'node:crypto';
import {
  mkdirSync,
  mkdtempSync,
  rmdirSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

export interface TempLibrary {
  root: string;
  cleanup(): void;
  mkdir(relative: string): string;
  write(relative: string, content?: string | Buffer, mtime?: Date): string;
  symlink(target: string, linkRelative: string): string;
}

/** Builds an isolated, disposable media tree for scanner/indexer tests. */
export function createTempLibrary(): TempLibrary {
  const root = mkdtempSync(join(tmpdir(), 'midoteca-lib-'));
  const links: string[] = [];
  return {
    root,
    cleanup() {
      // Remove links first: on Windows a recursive delete trips on a junction loop.
      for (const link of links.splice(0)) {
        try {
          if (process.platform === 'win32') rmdirSync(link);
          else unlinkSync(link);
        } catch {
          // already gone
        }
      }
      rmSync(root, { recursive: true, force: true });
    },
    mkdir(relative: string) {
      const absolute = join(root, relative);
      mkdirSync(absolute, { recursive: true });
      return absolute;
    },
    write(relative: string, content: string | Buffer = `content-${randomUUID()}`, mtime?: Date) {
      const absolute = join(root, relative);
      mkdirSync(dirname(absolute), { recursive: true });
      writeFileSync(absolute, content);
      if (mtime) utimesSync(absolute, mtime, mtime);
      return absolute;
    },
    symlink(target: string, linkRelative: string) {
      const absolute = join(root, linkRelative);
      mkdirSync(dirname(absolute), { recursive: true });
      // Windows only creates symlinks with admin rights or Developer Mode;
      // a junction links directories without them.
      symlinkSync(target, absolute, process.platform === 'win32' ? 'junction' : undefined);
      links.push(absolute);
      return absolute;
    },
  };
}
