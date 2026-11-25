import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PrepareMediaPlayback } from '../../../../src/modules/media/application/use-cases/prepare-media-playback';
import { assessPlayability } from '../../../../src/modules/media/domain/playability';
import { FfmpegMediaRemuxer } from '../../../../src/platform/media/ffmpeg-remuxer';
import { FfprobeMediaInspector } from '../../../../src/platform/media/ffprobe-inspector';
import {
  resolveFfmpegPath,
  resolveFfprobePath,
} from '../../../../src/platform/media/ffprobe-prober';

/**
 * Real ffmpeg/ffprobe: an H.264/AAC MPEG-TS (the container used by downloaded
 * HLS courses) must become a seekable MP4 without touching the source file.
 */
describe('preparação de reprodução (ffmpeg real)', () => {
  let dir = '';
  let source = '';
  let cacheDir = '';

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'midoteca-remux-'));
    source = join(dir, 'aula.ts');
    cacheDir = join(dir, 'cache');
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
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-f',
      'mpegts',
      source,
    ]);
  }, 60_000);

  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  afterEach(() => {
    rmSync(cacheDir, { recursive: true, force: true });
  });

  it('considera o MPEG-TS H.264/AAC reproduzível no desktop', async () => {
    const inspection = await new FfprobeMediaInspector().inspect(source);

    expect(assessPlayability(inspection)).toEqual({ playability: 'playable', reason: null });
  });

  it('remuxa o MPEG-TS para MP4 e mantém o arquivo original intacto', async () => {
    const before = readFileSync(source);
    const useCase = new PrepareMediaPlayback({
      inspector: new FfprobeMediaInspector(),
      remuxer: new FfmpegMediaRemuxer(),
      cacheDir,
    });

    const result = await useCase.prepare(source);

    // Primeiro o motivo: se o remux falhar, a mensagem mostra o erro real do ffmpeg.
    expect(result.failure).toBeUndefined();
    expect(result).toMatchObject({ prepared: true, path: expect.stringMatching(/\.mp4$/) });
    expect(readFileSync(source)).toEqual(before);

    const probed = execFileSync(resolveFfprobePath(), [
      '-v',
      'error',
      '-show_entries',
      'format=format_name',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      result.path,
    ])
      .toString()
      .trim();
    expect(probed).toContain('mp4');
  }, 60_000);
});
