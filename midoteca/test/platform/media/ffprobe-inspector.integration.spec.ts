import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveFfmpegPath } from '../../../src/platform/media/ffprobe-prober';
import { FfprobeMediaInspector } from '../../../src/platform/media/ffprobe-inspector';

/** Real ffprobe over a real VP8/Vorbis WebM and over the same file with a zeroed head. */
describe('FfprobeMediaInspector (binário real)', () => {
  let dir: string;
  let valid: string;
  const inspector = new FfprobeMediaInspector();

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'midoteca-inspect-'));
    valid = join(dir, 'aula.webm');
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
      valid,
    ]);
  }, 60_000);

  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('lê contêiner e codecs de um WebM válido', async () => {
    await expect(inspector.inspect(valid)).resolves.toEqual({
      readable: true,
      container: 'matroska,webm',
      videoCodec: 'vp8',
      audioCodec: 'vorbis',
    });
  }, 30_000);

  it('reporta ilegível um WebM com o início zerado (download/cópia incompletos)', async () => {
    const bytes = readFileSync(valid);
    bytes.fill(0, 0, Math.floor(bytes.length * 0.8));
    const damaged = join(dir, 'danificado.webm');
    writeFileSync(damaged, bytes);

    const result = await inspector.inspect(damaged);
    expect(result.readable).toBe(false);
    expect(result.error).toMatch(/invalid data/i);
  }, 30_000);
});
