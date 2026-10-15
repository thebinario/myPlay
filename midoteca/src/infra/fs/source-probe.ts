import { access, constants, stat } from 'node:fs/promises';
import type { SourceProbe } from '../../core/indexing/ports';

/**
 * Filesystem-backed `SourceProbe`. Volume identity is derived from the POSIX
 * device id (`stat.dev`) combined with the platform, which stays stable across
 * remounts at different mount points. On platforms where the device id is not
 * meaningful (typically 0 on Windows) it returns null and callers fall back to
 * path-based recognition.
 */
export class FsSourceProbe implements SourceProbe {
  async inspect(
    path: string,
  ): Promise<{ exists: boolean; isDirectory: boolean; readable: boolean }> {
    try {
      const stats = await stat(path);
      const isDirectory = stats.isDirectory();
      let readable = false;
      if (isDirectory) {
        try {
          await access(path, constants.R_OK);
          readable = true;
        } catch {
          readable = false;
        }
      }
      return { exists: true, isDirectory, readable };
    } catch {
      return { exists: false, isDirectory: false, readable: false };
    }
  }

  async volumeId(path: string): Promise<string | null> {
    try {
      const stats = await stat(path);
      if (stats.dev === 0) return null;
      return `${process.platform}:${stats.dev}`;
    } catch {
      return null;
    }
  }
}
