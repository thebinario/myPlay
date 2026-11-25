import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FfmpegMediaRemuxer } from '../../../src/platform/media/ffmpeg-remuxer';

/**
 * Real ffmpeg (ffmpeg-static). When the remux fails, the error must say how
 * ffmpeg ended (exit code or signal) and what it printed — a bare
 * "Command failed" hides crashes that print nothing (seen on Linux CI).
 */
describe('FfmpegMediaRemuxer (ffmpeg real)', () => {
  let dir = '';

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'midoteca-remuxer-'));
  });

  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('explica a falha com o código de saída e a saída de erro do ffmpeg', async () => {
    const broken = join(dir, 'quebrado.ts');
    writeFileSync(broken, 'isto não é um vídeo');

    const error = await new FfmpegMediaRemuxer()
      .remux(broken, join(dir, 'saida.mp4'))
      .then(() => null)
      .catch((cause: unknown) => cause as Error);

    expect(error).toBeInstanceOf(Error);
    expect(error!.message).toMatch(/^ffmpeg falhou \((código \d+|sinal \w+)\)/);
    expect(error!.message).not.toContain('Command failed');
  });
});
