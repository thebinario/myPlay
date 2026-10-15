import type { DiscoveredFile, ScanProgress } from './types';

export interface ScanOptions {
  /** Cooperative cancellation. When aborted the scan stops promptly. */
  signal?: AbortSignal;
  /** Called periodically (throttled) with progress counters. */
  onProgress?: (progress: ScanProgress) => void;
  /** Minimum interval between progress callbacks, in ms. Default 250. */
  progressIntervalMs?: number;
  /** Follow symlinked directories (off by default to avoid cycles). */
  followSymlinks?: boolean;
}

/**
 * Filesystem port. Implementations must be iterative (no deep recursion),
 * tolerant of unreadable directories, and must not read file contents.
 */
export interface FileScanner {
  scan(rootPath: string, options?: ScanOptions): AsyncIterable<DiscoveredFile>;
}
