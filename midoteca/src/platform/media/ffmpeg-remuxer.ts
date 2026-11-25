import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { MediaRemuxer } from '../../modules/media/domain/ports';
import { resolveFfmpegPath } from './ffprobe-prober';

const run = promisify(execFile);

/** Large lectures can take a while to copy, but never re-encode here. */
const REMUX_TIMEOUT_MS = 30 * 60_000;

/**
 * Copies the first video and audio streams into a fast-start MP4. Used for
 * MPEG-TS (and similar) files whose codecs Chromium already decodes; the
 * source file is only read.
 */
export class FfmpegMediaRemuxer implements MediaRemuxer {
  async remux(sourcePath: string, destinationPath: string): Promise<void> {
    try {
      await this.run(sourcePath, destinationPath);
    } catch (error) {
      throw describeFailure(error);
    }
  }

  private async run(sourcePath: string, destinationPath: string): Promise<void> {
    await run(
      resolveFfmpegPath(),
      [
        // Never wait for keyboard commands on stdin (no terminal in the app/CI).
        '-nostdin',
        '-v',
        'error',
        '-y',
        '-i',
        sourcePath,
        '-map',
        '0:v:0',
        '-map',
        '0:a:0?',
        '-sn',
        '-dn',
        '-c',
        'copy',
        '-avoid_negative_ts',
        'make_zero',
        '-movflags',
        '+faststart',
        '-f',
        'mp4',
        destinationPath,
      ],
      { windowsHide: true, timeout: REMUX_TIMEOUT_MS },
    );
  }
}

/**
 * "Command failed: <command line>" says nothing about how ffmpeg ended; report
 * the exit code or the signal (a crash prints no message) and its stderr.
 */
function describeFailure(error: unknown): Error {
  const failure = error as { code?: unknown; signal?: unknown; stderr?: unknown };
  const how =
    typeof failure.signal === 'string' && failure.signal
      ? `sinal ${failure.signal}`
      : typeof failure.code === 'number'
        ? `código ${failure.code}`
        : String(failure.code ?? 'erro desconhecido');
  const stderr = String(failure.stderr ?? '').trim();
  return new Error(`ffmpeg falhou (${how})${stderr ? `: ${stderr}` : ' sem mensagem'}`, {
    cause: error,
  });
}
