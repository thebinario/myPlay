import { execFile } from 'node:child_process';
import type { FrameSampler } from '../../modules/media/domain/analysis';
import {
  FRAME_HEIGHT,
  FRAME_WIDTH,
  dHash,
  sampleTimestamps,
} from '../../modules/media/domain/perceptual-fingerprint';
import { resolveFfmpegPath } from './ffprobe-prober';

function grabFrame(absolutePath: string, atMs: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    execFile(
      resolveFfmpegPath(),
      [
        '-v',
        'error',
        '-ss',
        (atMs / 1000).toFixed(3),
        '-i',
        absolutePath,
        '-frames:v',
        '1',
        '-vf',
        `scale=${FRAME_WIDTH}:${FRAME_HEIGHT}:flags=area,format=gray`,
        '-f',
        'rawvideo',
        'pipe:1',
      ],
      { encoding: 'buffer', windowsHide: true, timeout: 30_000, maxBuffer: 1024 * 1024 },
      (error, stdout) => {
        if (error) return reject(error);
        if (stdout.length < FRAME_WIDTH * FRAME_HEIGHT) {
          return reject(new Error(`ffmpeg não retornou quadro em ${atMs}ms`));
        }
        resolve(new Uint8Array(stdout.subarray(0, FRAME_WIDTH * FRAME_HEIGHT)));
      },
    );
  });
}

/**
 * Samples frames with ffmpeg (input seek, so it only decodes near each
 * timestamp) and hashes them with the domain dHash. Read-only.
 */
export class FfmpegFrameSampler implements FrameSampler {
  async sampleHashes(absolutePath: string, durationMs: number): Promise<string[]> {
    const hashes: string[] = [];
    for (const atMs of sampleTimestamps(durationMs)) {
      hashes.push(dHash(await grabFrame(absolutePath, atMs)));
    }
    return hashes;
  }
}
