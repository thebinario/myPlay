import type { JsonObject } from '../shared/json';

/**
 * A `MediaFile` is a physical file on a `LibrarySource`. Logical content
 * (lessons, documents) references it, never the other way around.
 */
export type MediaType = 'video' | 'audio' | 'pdf' | 'subtitle' | 'image' | 'other';

/**
 * Whether the file is currently reachable. A missing file downgrades to
 * `missing` instead of deleting the row, preserving history.
 */
export type MediaAvailability = 'available' | 'missing' | 'unverified';

export interface MediaFile {
  id: string;
  sourceId: string;
  /** Path relative to the source root; never absolute. */
  relativePath: string;
  mediaType: MediaType;
  /** Size in bytes; null when unknown. */
  fileSize: number | null;
  /** Duration in milliseconds for time-based media; null otherwise. */
  durationMs: number | null;
  /** File mtime (ISO-8601 UTC); null when unknown. */
  modifiedAt: string | null;
  /** Content hash for dedup/fingerprint; NOT globally unique on purpose. */
  sha256: string | null;
  availability: MediaAvailability;
  /** ISO time this row was last observed by a successful scan; null if never. */
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type MediaTrackKind = 'subtitle' | 'audio' | 'video' | 'chapter' | 'attachment';

/** Optional auxiliary streams belonging to a media file (e.g. subtitles). */
export interface MediaTrack {
  id: string;
  mediaFileId: string;
  kind: MediaTrackKind;
  /** BCP-47 language tag when known. */
  language: string | null;
  /** Path relative to the source root, or an external/detached path. */
  path: string | null;
  metadata: JsonObject | null;
}

export const MEDIA_TYPES: readonly MediaType[] = [
  'video',
  'audio',
  'pdf',
  'subtitle',
  'image',
  'other',
];

export const MEDIA_AVAILABILITIES: readonly MediaAvailability[] = [
  'available',
  'missing',
  'unverified',
];

export const MEDIA_TRACK_KINDS: readonly MediaTrackKind[] = [
  'subtitle',
  'audio',
  'video',
  'chapter',
  'attachment',
];
