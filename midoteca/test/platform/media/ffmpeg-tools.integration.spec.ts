import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FfprobeMediaProber, resolveFfmpegPath } from '../../../src/platform/media/ffprobe-prober';
import { FfmpegFrameSampler } from '../../../src/platform/media/ffmpeg-frame-sampler';
import { NodeFileHasher } from '../../../src/platform/fs/file-hasher';
import { isPerceptualMatch } from '../../../src/modules/media/domain/perceptual-fingerprint';

/**
 * Real ffmpeg/ffprobe (ffmpeg-static / ffprobe-static). Generates the same
 * synthetic clip in two resolutions/bitrates (a re-encode) plus a different
 * clip, then checks probe + perceptual fingerprint end to end.
 */
describe('ffmpeg media tools (real binaries)', () => {
  let dir: string;
  const prober = new FfprobeMediaProber();
  const sampler = new FfmpegFrameSampler();

  function render(name: string, source: string, size: string, crf: number): string {
    const out = join(dir, name);
    execFileSync(resolveFfmpegPath(), [
      '-v',
      'error',
      '-y',
      '-f',
      'lavfi',
      '-i',
      `${source}=size=640x360:rate=24`,
      '-t',
      '6',
      '-vf',
      `scale=${size}`,
      '-c:v',
      'libx264',
      '-crf',
      String(crf),
      '-pix_fmt',
      'yuv420p',
      out,
    ]);
    return out;
  }

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'midoteca-ffmpeg-'));
  }, 60_000);

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('probes the real duration', async () => {
    const clip = render('clip.mp4', 'testsrc2', '640:360', 23);
    const { durationMs } = await prober.probe(clip);
    expect(durationMs).toBeGreaterThan(5_800);
    expect(durationMs).toBeLessThan(6_300);
  }, 60_000);

  it('matches a re-encoded copy and rejects different content', async () => {
    const hd = render('hd.mp4', 'testsrc2', '640:360', 20);
    const sd = render('sd.mp4', 'testsrc2', '320:180', 35);
    const other = render('other.mp4', 'mandelbrot', '640:360', 23);

    const [a, b, c] = await Promise.all(
      [hd, sd, other].map((file) => sampler.sampleHashes(file, 6_000)),
    );
    expect(a).toHaveLength(16);
    expect(isPerceptualMatch(a, b)).toBe(true);
    expect(isPerceptualMatch(a, c)).toBe(false);
  }, 120_000);

  it('hashes files (partial + full)', async () => {
    const file = join(dir, 'bytes.bin');
    writeFileSync(file, Buffer.alloc(3 * 1024 * 1024, 7));
    const hasher = new NodeFileHasher();
    expect(await hasher.partialHash(file)).toMatch(/^[0-9a-f]{64}$/);
    expect(await hasher.fullHash(file)).toMatch(/^[0-9a-f]{64}$/);
    expect(await hasher.partialHash(file)).not.toBe(await hasher.fullHash(file));
  });
});
