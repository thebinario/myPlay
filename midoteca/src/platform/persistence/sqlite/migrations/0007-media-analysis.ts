import type { SqliteDatabase } from '../database';
import type { Migration } from './types';

/**
 * 0007 - media analysis (probe, hashes, perceptual fingerprints).
 *
 * Purely additive. Enables duplicate-content detection without touching files:
 * - `media_files.partial_hash`: sha256 of size + first/last MiB (cheap filter).
 * - `media_files.analyzed_at` / `analysis_error`: analysis bookkeeping; a NULL
 *   `analyzed_at` means "pending", so the work queue is resumable by design.
 * - `media_fingerprints`: per-frame dHashes of videos (JSON array of hex).
 * - `media_duplicate_links`: perceptual matches (re-encodes) between videos.
 */
export const migration0007MediaAnalysis: Migration = {
  id: 7,
  name: '0007-media-analysis',
  up(db: SqliteDatabase): void {
    db.exec(`
      ALTER TABLE media_files ADD COLUMN partial_hash TEXT;
      ALTER TABLE media_files ADD COLUMN analyzed_at TEXT;
      ALTER TABLE media_files ADD COLUMN analysis_error TEXT;
      CREATE INDEX ix_media_files_size_partial ON media_files(file_size, partial_hash);
      CREATE INDEX ix_media_files_type_duration ON media_files(media_type, duration_ms);
      CREATE INDEX ix_media_files_analysis ON media_files(source_id, analyzed_at);

      CREATE TABLE media_fingerprints (
        media_file_id TEXT PRIMARY KEY REFERENCES media_files(id) ON DELETE CASCADE,
        kind          TEXT NOT NULL CHECK (kind IN ('dhash-16')),
        frames        TEXT NOT NULL,
        created_at    TEXT NOT NULL
      );

      CREATE TABLE media_duplicate_links (
        media_a    TEXT NOT NULL REFERENCES media_files(id) ON DELETE CASCADE,
        media_b    TEXT NOT NULL REFERENCES media_files(id) ON DELETE CASCADE,
        kind       TEXT NOT NULL CHECK (kind IN ('perceptual')),
        similarity REAL NOT NULL CHECK (similarity >= 0 AND similarity <= 1),
        created_at TEXT NOT NULL,
        PRIMARY KEY (media_a, media_b),
        CHECK (media_a < media_b)
      );
      CREATE INDEX ix_media_duplicate_links_b ON media_duplicate_links(media_b);
    `);
  },
  down(db: SqliteDatabase): void {
    db.exec(`
      DROP TABLE IF EXISTS media_duplicate_links;
      DROP TABLE IF EXISTS media_fingerprints;
      DROP INDEX IF EXISTS ix_media_files_analysis;
      DROP INDEX IF EXISTS ix_media_files_type_duration;
      DROP INDEX IF EXISTS ix_media_files_size_partial;
    `);
  },
};
