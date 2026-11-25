import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { MediaInspection } from '../../../../src/modules/media/domain/playability';

/**
 * On Windows an antivirus scan (or the indexer) may hold the freshly written
 * MP4 for a moment, making the rename into the cache fail with EPERM/EBUSY.
 * The preparation must retry instead of silently serving the raw MPEG-TS.
 */
const renameFailures = vi.hoisted(() => ({ remaining: 0, code: 'EPERM' }));

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    rename: vi.fn(async (from: string, to: string) => {
      if (renameFailures.remaining > 0) {
        renameFailures.remaining -= 1;
        throw Object.assign(new Error(`${renameFailures.code}: busy`), {
          code: renameFailures.code,
        });
      }
      return actual.rename(from, to);
    }),
  };
});

const TS: MediaInspection = {
  readable: true,
  container: 'mpegts',
  videoCodec: 'h264',
  audioCodec: 'aac',
};

describe('media/application — PrepareMediaPlayback (arquivo temporariamente bloqueado)', () => {
  let dir = '';
  let source = '';

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'midoteca-rename-'));
    source = join(dir, 'aula.ts');
    await writeFile(source, 'ts-bytes');
  });

  afterEach(async () => {
    renameFailures.remaining = 0;
    await rm(dir, { recursive: true, force: true });
  });

  async function prepare() {
    const { PrepareMediaPlayback } =
      await import('../../../../src/modules/media/application/use-cases/prepare-media-playback');
    const useCase = new PrepareMediaPlayback({
      inspector: { inspect: async () => TS },
      remuxer: { remux: async (_source, destination) => writeFile(destination, 'mp4') },
      cacheDir: join(dir, 'cache'),
      retryDelayMs: 1,
    });
    return useCase.prepare(source);
  }

  it.each(['EPERM', 'EBUSY', 'EACCES'])(
    'tenta de novo quando o rename falha com %s',
    async (code) => {
      renameFailures.code = code;
      renameFailures.remaining = 2;

      const result = await prepare();

      expect(result).toMatchObject({ prepared: true });
      expect(await readFile(result.path, 'utf8')).toBe('mp4');
    },
  );

  it('quando não consegue, serve o original e informa o motivo', async () => {
    renameFailures.code = 'EPERM';
    renameFailures.remaining = 100;

    const result = await prepare();

    expect(result).toMatchObject({ path: source, prepared: false });
    expect(result.failure).toMatch(/EPERM/);
  });
});
