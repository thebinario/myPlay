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
    await run(
      resolveFfmpegPath(),
      [
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
