import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RecursiveFileScanner, classifyExtension } from '../src/infra/fs/recursive-scanner';
import type { DiscoveredFile } from '../src/core/indexing/types';
import { createTempLibrary, type TempLibrary } from './helpers/temp-library';

async function collect(
  scanner: RecursiveFileScanner,
  root: string,
  options?: Parameters<RecursiveFileScanner['scan']>[1],
): Promise<DiscoveredFile[]> {
  const files: DiscoveredFile[] = [];
  for await (const file of scanner.scan(root, options)) files.push(file);
  return files;
}

describe('RecursiveFileScanner', () => {
  let library: TempLibrary;
  let scanner: RecursiveFileScanner;

  beforeEach(() => {
    library = createTempLibrary();
    scanner = new RecursiveFileScanner();
  });

  afterEach(() => library.cleanup());

  it('classifies supported extensions and ignores the rest', () => {
    expect(classifyExtension('.MP4')).toBe('video');
    expect(classifyExtension('.pdf')).toBe('pdf');
    expect(classifyExtension('.srt')).toBe('subtitle');
    expect(classifyExtension('.txt')).toBeNull();
    expect(classifyExtension('')).toBeNull();
  });

  it('walks nested directories and returns posix relative paths', async () => {
    library.write('Curso/Modulo/01 - Intro.mp4', 'video');
    library.write('Curso/Modulo/Apostila.pdf', 'pdf');
    library.write('Curso/Modulo/legenda.srt', 'subtitle');
    library.write('Curso/notas.txt', 'ignored');

    const files = await collect(scanner, library.root);
    const paths = files.map((f) => f.relativePath).sort();
    expect(paths).toEqual([
      'Curso/Modulo/01 - Intro.mp4',
      'Curso/Modulo/Apostila.pdf',
      'Curso/Modulo/legenda.srt',
    ]);
    const video = files.find((f) => f.kind === 'video')!;
    expect(video.fileName).toBe('01 - Intro.mp4');
    expect(video.extension).toBe('.mp4');
    expect(video.size).toBeGreaterThan(0);
  });

  it('does not loop forever on a symlink cycle', async () => {
    library.write('a/video.mp4', 'video');
    library.symlink(library.root, 'a/loop');

    const files = await collect(scanner, library.root);
    expect(files).toHaveLength(1);
  });

  it('honors an abort signal', async () => {
    for (let i = 0; i < 20; i += 1) {
      library.write(`dir/file-${i}.mp4`, `v${i}`);
    }
    const controller = new AbortController();
    controller.abort();
    const files = await collect(scanner, library.root, {
      signal: controller.signal,
    });
    expect(files).toHaveLength(0);
  });

  it('reports progress through the callback', async () => {
    library.write('a/one.mp4', 'a');
    library.write('b/two.pdf', 'b');
    const seen: number[] = [];
    await collect(scanner, library.root, {
      progressIntervalMs: 0,
      onProgress: (p) => seen.push(p.matched),
    });
    expect(seen.length).toBeGreaterThan(0);
    expect(seen[seen.length - 1]).toBe(2);
  });
});
