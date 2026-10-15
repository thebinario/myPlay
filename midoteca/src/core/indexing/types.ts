import type { MediaType } from '../media/entities';

/** Coarse classification performed during discovery. */
export type MediaKind = 'video' | 'pdf' | 'subtitle';

export interface DiscoveredFile {
  absolutePath: string;
  /** Path relative to the source root, POSIX-normalized (always `/`). */
  relativePath: string;
  fileName: string;
  /** Lowercased extension including the dot, e.g. `.mp4`. */
  extension: string;
  kind: MediaKind;
  /** Size in bytes. */
  size: number;
  /** mtime as ISO-8601 UTC. */
  modifiedAt: string;
}

export interface ScanProgress {
  /** Files matched (supported) so far. */
  matched: number;
  /** Filesystem entries visited (files + directories). */
  visited: number;
  /** Directories entered. */
  directories: number;
  /** Entries skipped due to read/permission errors. */
  errors: number;
  /** Path currently being processed (best effort). */
  currentPath: string | null;
}

export type IndexStatus = 'completed' | 'cancelled' | 'source-unavailable' | 'failed';

export interface IndexSummary {
  sourceId: string;
  status: IndexStatus;
  discovered: number;
  created: number;
  updated: number;
  moved: number;
  unchanged: number;
  missing: number;
  errors: number;
  durationMs: number;
}

export function mediaKindToType(kind: MediaKind): MediaType {
  switch (kind) {
    case 'video':
      return 'video';
    case 'pdf':
      return 'pdf';
    case 'subtitle':
      return 'subtitle';
  }
}
