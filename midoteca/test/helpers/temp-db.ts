import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export interface TempDatabase {
  dir: string;
  file: string;
  cleanup(): void;
}

/**
 * Creates an isolated, file-backed database inside the OS temp dir.
 *
 * A real file (not `:memory:`) is used on purpose so WAL mode, persistence
 * across reopen and multi-connection behavior are exercised like production.
 */
export function createTempDatabase(): TempDatabase {
  const dir = mkdtempSync(join(tmpdir(), 'midoteca-test-'));
  const file = join(dir, `midoteca-${randomUUID()}.sqlite`);
  return {
    dir,
    file,
    cleanup() {
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
