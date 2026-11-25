import { afterEach, describe, expect, it } from 'vitest';
import { resolveFfmpegPath, resolveFfprobePath } from '../../../src/platform/media/ffprobe-prober';

/**
 * The bundled static binaries are the default (the Windows app ships them).
 * `MIDOTECA_FFMPEG_PATH` / `MIDOTECA_FFPROBE_PATH` point to another build —
 * used by the Linux CI, where the static ffmpeg 6.0 of ffmpeg-static crashes
 * (SIGSEGV) remuxing MPEG-TS.
 */
describe('caminho do ffmpeg/ffprobe', () => {
  const saved = {
    ffmpeg: process.env.MIDOTECA_FFMPEG_PATH,
    ffprobe: process.env.MIDOTECA_FFPROBE_PATH,
  };

  afterEach(() => {
    restore('MIDOTECA_FFMPEG_PATH', saved.ffmpeg);
    restore('MIDOTECA_FFPROBE_PATH', saved.ffprobe);
  });

  function restore(name: string, value: string | undefined) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }

  it('usa os binários empacotados por padrão', () => {
    delete process.env.MIDOTECA_FFMPEG_PATH;
    delete process.env.MIDOTECA_FFPROBE_PATH;

    expect(resolveFfmpegPath()).toMatch(/ffmpeg-static/);
    expect(resolveFfprobePath()).toMatch(/ffprobe-static/);
  });

  it('respeita MIDOTECA_FFMPEG_PATH e MIDOTECA_FFPROBE_PATH', () => {
    process.env.MIDOTECA_FFMPEG_PATH = ' /usr/bin/ffmpeg ';
    process.env.MIDOTECA_FFPROBE_PATH = '/usr/bin/ffprobe';

    expect(resolveFfmpegPath()).toBe('/usr/bin/ffmpeg');
    expect(resolveFfprobePath()).toBe('/usr/bin/ffprobe');
  });

  it('ignora a variável vazia', () => {
    process.env.MIDOTECA_FFMPEG_PATH = '  ';

    expect(resolveFfmpegPath()).toMatch(/ffmpeg-static/);
  });
});
