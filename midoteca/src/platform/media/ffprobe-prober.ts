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

/**
 * Another ffmpeg/ffprobe build, when set. The Linux CI uses the distro build:
 * the static ffmpeg 6.0 of ffmpeg-static crashes (SIGSEGV) remuxing MPEG-TS
 * on Ubuntu 24.04. The Windows app keeps the bundled binaries.
 */
function overridden(name: 'MIDOTECA_FFMPEG_PATH' | 'MIDOTECA_FFPROBE_PATH'): string | null {
  return process.env[name]?.trim() || null;
}

export function resolveFfmpegPath(): string {
  const custom = overridden('MIDOTECA_FFMPEG_PATH');
  if (custom) return custom;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require('ffmpeg-static') as string | null;
  if (!path) throw new Error('ffmpeg-static não possui binário para esta plataforma');
  return unpacked(path);
}

export function resolveFfprobePath(): string {
  const custom = overridden('MIDOTECA_FFPROBE_PATH');
  if (custom) return custom;
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
