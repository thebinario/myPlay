import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { MediaProber } from '../../modules/media/domain/analysis';

const run = promisify(execFile);

/**
 * Inside a packaged Electron app the binaries live in `app.asar.unpacked`
 * (see `asarUnpack` in electron-builder.yml); `require` still reports the
 * `app.asar` path, which cannot be executed.
 */
function unpacked(binaryPath: string): string {
  return binaryPath.replace(/app\.asar([\\/])/, 'app.asar.unpacked$1');
}

export function resolveFfmpegPath(): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require('ffmpeg-static') as string | null;
  if (!path) throw new Error('ffmpeg-static não possui binário para esta plataforma');
  return unpacked(path);
}

export function resolveFfprobePath(): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { path } = require('ffprobe-static') as { path: string };
  return unpacked(path);
}

/** Reads the container duration with ffprobe (no decoding, read-only). */
export class FfprobeMediaProber implements MediaProber {
  async probe(absolutePath: string): Promise<{ durationMs: number | null }> {
    const { stdout } = await run(
      resolveFfprobePath(),
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'json', absolutePath],
      { windowsHide: true, timeout: 30_000 },
    );
    const seconds = Number(
      (JSON.parse(stdout) as { format?: { duration?: string } }).format?.duration,
    );
    return {
      durationMs: Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds * 1000) : null,
    };
  }
}
