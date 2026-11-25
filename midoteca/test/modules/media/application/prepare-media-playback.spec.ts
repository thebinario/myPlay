import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PrepareMediaPlayback } from '../../../../src/modules/media/application/use-cases/prepare-media-playback';
import type {
  MediaInspection,
  MediaInspector,
} from '../../../../src/modules/media/domain/playability';
import type { MediaRemuxer } from '../../../../src/modules/media/domain/ports';

const MP4: MediaInspection = {
  readable: true,
  container: 'mov,mp4,m4a,3gp,3g2,mj2',
  videoCodec: 'h264',
  audioCodec: 'aac',
};

const TS: MediaInspection = {
  readable: true,
  container: 'mpegts',
  videoCodec: 'h264',
  audioCodec: 'aac',
};

describe('media/application — PrepareMediaPlayback', () => {
  let dir = '';
  let source = '';
  let cacheDir = '';
  let inspector: MediaInspector;
  let remuxer: MediaRemuxer;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'midoteca-playback-'));
    source = join(dir, 'aula.ts');
    cacheDir = join(dir, 'cache');
    await writeFile(source, 'ts-bytes');
    inspector = { inspect: vi.fn(async () => TS) };
    remuxer = { remux: vi.fn(async (_source, destination) => writeFile(destination, 'mp4')) };
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('serve um MP4 nativo sem preparar nada', async () => {
    const mp4 = join(dir, 'aula.mp4');
    await writeFile(mp4, 'mp4-bytes');
    inspector.inspect = vi.fn(async () => MP4);
    const useCase = new PrepareMediaPlayback({ inspector, remuxer, cacheDir });

    const result = await useCase.prepare(mp4);

    expect(result).toEqual({ path: mp4, prepared: false });
    expect(inspector.inspect).not.toHaveBeenCalled();
    expect(remuxer.remux).not.toHaveBeenCalled();
  });

  it('remuxa MPEG-TS para um MP4 em cache e preserva o original', async () => {
    const useCase = new PrepareMediaPlayback({ inspector, remuxer, cacheDir });

    const result = await useCase.prepare(source);

    expect(result.prepared).toBe(true);
    expect(result.path).toMatch(/\.mp4$/);
    expect(result.path).not.toBe(source);
    await expect(readFile(result.path, 'utf8')).resolves.toBe('mp4');
    await expect(readFile(source, 'utf8')).resolves.toBe('ts-bytes');
    expect(remuxer.remux).toHaveBeenCalledTimes(1);
  });

  it('reutiliza o MP4 em cache em requisições de intervalo seguintes', async () => {
    const useCase = new PrepareMediaPlayback({ inspector, remuxer, cacheDir });

    const first = await useCase.prepare(source);
    const second = await useCase.prepare(source);

    expect(second).toEqual(first);
    expect(remuxer.remux).toHaveBeenCalledTimes(1);
  });

  it('invalida o cache quando o arquivo de origem muda', async () => {
    const useCase = new PrepareMediaPlayback({ inspector, remuxer, cacheDir });

    const first = await useCase.prepare(source);
    await writeFile(source, 'ts-bytes-changed');
    const second = await useCase.prepare(source);

    expect(second.path).not.toBe(first.path);
    expect(remuxer.remux).toHaveBeenCalledTimes(2);
  });

  it('mantém o original quando o remux falha, sem deixar cache parcial', async () => {
    remuxer.remux = vi.fn(async () => {
      throw new Error('ffmpeg falhou');
    });
    const useCase = new PrepareMediaPlayback({ inspector, remuxer, cacheDir });

    const result = await useCase.prepare(source);

    expect(result).toEqual({ path: source, prepared: false });
  });

  it('não prepara arquivo ilegível', async () => {
    inspector.inspect = vi.fn(async () => ({ readable: false, error: 'invalid data' }) as const);
    const useCase = new PrepareMediaPlayback({ inspector, remuxer, cacheDir });

    const result = await useCase.prepare(source);

    expect(result).toEqual({ path: source, prepared: false });
    expect(remuxer.remux).not.toHaveBeenCalled();
  });
});
