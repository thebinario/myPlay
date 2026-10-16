/**
 * Indexing is a Phase 2+ concern. Phase 1 only reserves the responsibility
 * boundary and the canonical job-type names that the future scanner/hasher will
 * enqueue through the `jobs` module. No scanning logic lives here yet.
 */
export const INDEXING_JOB_TYPES = {
  /** Walk a `LibrarySource` and reconcile `MediaFile` rows. */
  SCAN_SOURCE: 'indexing.scan-source',
  /** Compute the sha256 of a discovered media file. */
  HASH_MEDIA: 'indexing.hash-media',
  /** Probe container metadata (duration, tracks, page count). */
  PROBE_MEDIA: 'indexing.probe-media',
} as const;

export type IndexingJobType = (typeof INDEXING_JOB_TYPES)[keyof typeof INDEXING_JOB_TYPES];
