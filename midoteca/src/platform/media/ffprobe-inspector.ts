import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { MediaInspection, MediaInspector } from '../../modules/media/domain/playability';
import { resolveFfprobePath } from './ffprobe-prober';

const run = promisify(execFile);

interface ProbeOutput {
  format?: { format_name?: string };
  streams?: Array<{ codec_type?: string; codec_name?: string }>;
}

/** ffprobe exits non-zero with this kind of message when the data is not media. */
const UNREADABLE =
  /invalid data|moov atom not found|EBML header parsing failed|could not find codec parameters|end of file/i;

/**
 * Reads container and first video/audio codecs with ffprobe (no decoding,
 * read-only). An unreadable file resolves to `readable: false`; tool failures
 * (missing binary, timeout) reject, so callers keep the status unknown.
 */
export class FfprobeMediaInspector implements MediaInspector {
  async inspect(absolutePath: string): Promise<MediaInspection> {
    try {
      const { stdout } = await run(
        resolveFfprobePath(),
        [
          '-v',
          'error',
          '-show_entries',
          'format=format_name:stream=codec_type,codec_name',
          '-of',
          'json',
          absolutePath,
        ],
        { windowsHide: true, timeout: 30_000 },
      );
      const output = JSON.parse(stdout) as ProbeOutput;
      const codecOf = (type: string) =>
        output.streams?.find((stream) => stream.codec_type === type)?.codec_name ?? null;
      return {
        readable: true,
        container: output.format?.format_name ?? '',
        videoCodec: codecOf('video'),
        audioCodec: codecOf('audio'),
      };
    } catch (error) {
      const stderr = String((error as { stderr?: unknown }).stderr ?? '');
      const message = stderr.trim().split(/\r?\n/).at(-1) ?? '';
      if (UNREADABLE.test(stderr)) {
        return {
          readable: false,
          error: message.replace(/^.*?:\s(?=[A-Z])/, '') || 'arquivo ilegível',
        };
      }
      throw error;
    }
  }
}
