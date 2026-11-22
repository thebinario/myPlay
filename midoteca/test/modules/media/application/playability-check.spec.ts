import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createMidoteca, type Midoteca } from '../../../../src/index';
import { resolveFfmpegPath } from '../../../../src/platform/media/ffprobe-prober';
import { createTempDatabase, type TempDatabase } from '../../../helpers/temp-db';
import { createTempLibrary, type TempLibrary } from '../../../helpers/temp-library';

/**
 * Real ffprobe over real files: a valid VP8/Vorbis WebM and a copy whose head
 * was zeroed (what a truncated download/copy looks like on disk).
 */
describe('verificação de reprodutibilidade (ffprobe real + SQLite)', () => {
  let fixtures: string;
  let validBytes: Buffer;
  let temp: TempDatabase;
  let library: TempLibrary;
  let app: Midoteca;

  beforeAll(() => {
    fixtures = mkdtempSync(join(tmpdir(), 'midoteca-playable-'));
    const out = join(fixtures, 'valid.webm');
    execFileSync(resolveFfmpegPath(), [
      '-v',
      'error',
      '-y',
      '-f',
      'lavfi',
      '-i',
      'testsrc2=size=320x180:rate=15',
      '-f',
      'lavfi',
      '-i',
      'sine=frequency=440',
      '-t',
      '2',
      '-c:v',
      'libvpx',
      '-c:a',
      'libvorbis',
      out,
    ]);
    validBytes = readFileSync(out);
  }, 60_000);

  afterAll(() => rmSync(fixtures, { recursive: true, force: true }));

  beforeEach(() => {
    temp = createTempDatabase();
    library = createTempLibrary();
    app = createMidoteca({
      databaseFile: temp.file,
      mediaTools: {
        prober: { probe: async () => ({ durationMs: 2_000 }) },
        sampler: { sampleHashes: async () => [] },
      },
    });
  });

  afterEach(async () => {
    await app.jobRunner.stop();
    app.close();
    temp.cleanup();
    library.cleanup();
  });

  it('marca o vídeo danificado e o reproduzível, sem tocar nos arquivos', async () => {
    const damaged = Buffer.from(validBytes);
    damaged.fill(0, 0, Math.floor(damaged.length * 0.8));
    library.write('Curso A/Modulo 1/01 - Boa.webm', validBytes);
    library.write('Curso A/Modulo 1/02 - Danificada.webm', damaged);
    const before = readFileSync(join(library.root, 'Curso A/Modulo 1/02 - Danificada.webm'));

    const source = await app.sources.addSource({ rootPath: library.root });
    await app.indexer.runScan({ sourceId: source.id });
    await app.jobRunner.drain();

    const files = await app.media.listBySource(source.id);
    const byName = Object.fromEntries(
      files.map((file) => [file.relativePath.split('/').pop(), file]),
    );
    expect(byName['01 - Boa.webm']).toMatchObject({
      playability: 'playable',
      playabilityReason: null,
    });
    expect(byName['02 - Danificada.webm']).toMatchObject({ playability: 'damaged' });
    expect(byName['02 - Danificada.webm'].playabilityReason).toMatch(/invalid data/i);
    expect(readFileSync(join(library.root, 'Curso A/Modulo 1/02 - Danificada.webm'))).toEqual(
      before,
    );
  }, 60_000);

  it('verifica bibliotecas já indexadas antes desta versão (status desconhecido)', async () => {
    library.write('Curso A/Modulo 1/01 - Boa.webm', validBytes);
    const source = await app.sources.addSource({ rootPath: library.root });
    await app.indexer.runScan({ sourceId: source.id });
    await app.jobRunner.drain();
    app.database
      .prepare(
        'UPDATE media_files SET playability = NULL, playability_reason = NULL, playability_checked_at = NULL',
      )
      .run();

    await app.checkPlayability();
    await app.jobRunner.drain();

    const [file] = await app.media.listBySource(source.id);
    expect(file.playability).toBe('playable');
  }, 60_000);
});
