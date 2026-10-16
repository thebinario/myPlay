/**
 * A `LibrarySource` represents a physical storage root that Midoteca indexes
 * (typically an external drive). It is the anchor for relative paths: files are
 * never keyed by absolute path, only by (source, relativePath).
 */
export type LibrarySourceStatus = 'active' | 'offline' | 'scanning' | 'error';
export type LibraryType = 'course' | 'movie';

export interface LibrarySource {
  id: string;
  /** Absolute root path of the mounted volume when it was added. */
  rootPath: string;
  /** Friendly label independent of the path (e.g. "HD Cursos"). */
  displayName: string | null;
  /** Controls how indexed videos are grouped and how this source is filtered. */
  libraryType: LibraryType;
  /** Stable-ish volume/device identifier used for automatic drive recognition. */
  volumeId: string | null;
  status: LibrarySourceStatus;
  /** Last successfully completed scan (ISO-8601 UTC), or null if never scanned. */
  lastScanAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const LIBRARY_SOURCE_STATUSES: readonly LibrarySourceStatus[] = [
  'active',
  'offline',
  'scanning',
  'error',
];
