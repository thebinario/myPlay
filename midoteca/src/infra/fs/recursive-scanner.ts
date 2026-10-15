import { opendir, realpath, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { DiscoveredFile, MediaKind, ScanProgress } from '../../core/indexing/types';
import type { FileScanner, ScanOptions } from '../../core/indexing/scanner';

const VIDEO_EXTENSIONS = new Set([
  '.mp4',
  '.mkv',
  '.avi',
  '.mov',
  '.webm',
  '.wmv',
  '.m4v',
  '.mpg',
  '.mpeg',
]);
const PDF_EXTENSIONS = new Set(['.pdf']);
const SUBTITLE_EXTENSIONS = new Set(['.srt', '.vtt', '.ass', '.ssa']);

/** Classifies a file extension into a supported media kind, or null. */
export function classifyExtension(extension: string): MediaKind | null {
  const ext = extension.toLowerCase();
  if (VIDEO_EXTENSIONS.has(ext)) return 'video';
  if (PDF_EXTENSIONS.has(ext)) return 'pdf';
  if (SUBTITLE_EXTENSIONS.has(ext)) return 'subtitle';
  return null;
}

function extensionOf(fileName: string): string {
  const index = fileName.lastIndexOf('.');
  return index > 0 ? fileName.slice(index).toLowerCase() : '';
}

interface PendingDir {
  absolutePath: string;
  relativePath: string;
}

/**
 * Iterative, cycle-safe, read-only directory walker. It never opens file
 * contents, never mutates the filesystem, and tolerates unreadable entries by
 * counting them as errors and continuing.
 */
export class RecursiveFileScanner implements FileScanner {
  async *scan(rootPath: string, options: ScanOptions = {}): AsyncIterable<DiscoveredFile> {
    const signal = options.signal;
    const followSymlinks = options.followSymlinks ?? false;
    const progressIntervalMs = options.progressIntervalMs ?? 250;

    const progress: ScanProgress = {
      matched: 0,
      visited: 0,
      directories: 0,
      errors: 0,
      currentPath: null,
    };
    let lastEmit = 0;
    const emit = (force = false) => {
      if (!options.onProgress) return;
      const now = Date.now();
      if (!force && now - lastEmit < progressIntervalMs) return;
      lastEmit = now;
      options.onProgress({ ...progress });
    };

    const visitedDirs = new Set<string>();
    const stack: PendingDir[] = [{ absolutePath: rootPath, relativePath: '' }];

    while (stack.length > 0) {
      if (signal?.aborted) return;
      const current = stack.pop()!;

      let realDir: string;
      try {
        realDir = await realpath(current.absolutePath);
      } catch {
        progress.errors += 1;
        continue;
      }
      if (visitedDirs.has(realDir)) continue;
      visitedDirs.add(realDir);
      progress.directories += 1;

      let dir;
      try {
        dir = await opendir(current.absolutePath);
      } catch {
        progress.errors += 1;
        continue;
      }

      try {
        for await (const entry of dir) {
          if (signal?.aborted) return;
          progress.visited += 1;
          const childRelative = current.relativePath
            ? `${current.relativePath}/${entry.name}`
            : entry.name;
          progress.currentPath = childRelative;
          emit();

          const childAbsolute = join(current.absolutePath, entry.name);

          if (entry.isDirectory()) {
            stack.push({
              absolutePath: childAbsolute,
              relativePath: childRelative,
            });
            continue;
          }

          let isFile = entry.isFile();
          let isDir = entry.isDirectory();
          if (entry.isSymbolicLink()) {
            try {
              const target = await stat(childAbsolute);
              isFile = target.isFile();
              isDir = target.isDirectory();
            } catch {
              progress.errors += 1;
              continue;
            }
            if (isDir && !followSymlinks) continue;
          }

          if (isDir) {
            if (followSymlinks) {
              stack.push({
                absolutePath: childAbsolute,
                relativePath: childRelative,
              });
            }
            continue;
          }
          if (!isFile) continue;

          const kind = classifyExtension(extensionOf(entry.name));
          if (!kind) continue;

          let stats;
          try {
            stats = await stat(childAbsolute);
          } catch {
            progress.errors += 1;
            continue;
          }

          progress.matched += 1;
          emit();

          yield {
            absolutePath: childAbsolute,
            relativePath: childRelative,
            fileName: entry.name,
            extension: extensionOf(entry.name),
            kind,
            size: stats.size,
            modifiedAt: new Date(stats.mtimeMs).toISOString(),
          } satisfies DiscoveredFile;
        }
      } finally {
        await dir.close().catch(() => undefined);
      }
    }

    emit(true);
  }
}
