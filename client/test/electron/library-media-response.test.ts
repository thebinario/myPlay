import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createLibraryMediaResponse } from '../../electron/library-media-response.cjs';

describe('createLibraryMediaResponse', () => {
  let directory = '';

  afterEach(async () => {
    if (directory) await rm(directory, { recursive: true, force: true });
    directory = '';
  });

  it('responde a busca de vídeo com intervalo parcial de bytes', async () => {
    directory = await mkdtemp(path.join(tmpdir(), 'midoteca-media-'));
    const mediaPath = path.join(directory, 'video.mp4');
    await writeFile(mediaPath, '0123456789');

    const response = await createLibraryMediaResponse(
      mediaPath,
      new Request('midoteca-media://media/video.mp4', {
        headers: { range: 'bytes=3-6' },
      }),
    );

    expect(response.status).toBe(206);
    expect(response.headers.get('accept-ranges')).toBe('bytes');
    expect(response.headers.get('content-range')).toBe('bytes 3-6/10');
    expect(response.headers.get('content-length')).toBe('4');
    await expect(response.text()).resolves.toBe('3456');
  });

  it('declara o tipo de mídia correto para MP4 e MPEG-TS', async () => {
    directory = await mkdtemp(path.join(tmpdir(), 'midoteca-media-'));
    const mp4Path = path.join(directory, 'video.mp4');
    const tsPath = path.join(directory, 'aula.ts');
    await writeFile(mp4Path, 'mp4');
    await writeFile(tsPath, 'ts');

    const mp4 = await createLibraryMediaResponse(
      mp4Path,
      new Request('midoteca-media://media/video.mp4'),
    );
    const ts = await createLibraryMediaResponse(
      tsPath,
      new Request('midoteca-media://media/aula.ts'),
    );

    expect(mp4.headers.get('content-type')).toBe('video/mp4');
    expect(ts.headers.get('content-type')).toBe('video/mp2t');
  });
});
