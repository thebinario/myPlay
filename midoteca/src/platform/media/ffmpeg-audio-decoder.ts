import { execFile } from 'node:child_process';
import type { AudioDecoder } from '../../modules/media/domain/transcription';
import { resolveFfmpegPath } from './ffprobe-prober';

const SAMPLE_RATE = 16_000;

/**
 * Decodes one window of audio with ffmpeg (input seek, so only that window is
 * read) as 16 kHz mono float32 — the format Whisper expects. Read-only.
 */
export class FfmpegAudioDecoder implements AudioDecoder {
  decodeWindow(absolutePath: string, offsetMs: number, lengthMs: number): Promise<Float32Array> {
    return new Promise((resolve, reject) => {
      execFile(
        resolveFfmpegPath(),
        [
          '-v',
          'error',
          '-ss',
          (offsetMs / 1000).toFixed(3),
          '-t',
          (lengthMs / 1000).toFixed(3),
          '-i',
          absolutePath,
          '-vn',
          '-ac',
          '1',
          '-ar',
          String(SAMPLE_RATE),
          '-f',
          'f32le',
          'pipe:1',
        ],
        {
          encoding: 'buffer',
          windowsHide: true,
          timeout: 120_000,
          maxBuffer: Math.ceil((lengthMs / 1000) * SAMPLE_RATE * 4) + 1024 * 1024,
        },
        (error, stdout) => {
          if (error) return reject(error);
          const samples = Math.floor(stdout.byteLength / 4);
          // Copy into an aligned buffer: Node buffers may start at odd offsets.
          const aligned = new Float32Array(samples);
          for (let i = 0; i < samples; i++) aligned[i] = stdout.readFloatLE(i * 4);
          resolve(aligned);
        },
      );
    });
  }
}
