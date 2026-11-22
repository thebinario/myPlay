import type { SqliteDatabase } from '../database';
import type { Migration } from './types';

/**
 * 0011 - media playability (can the desktop player decode this file?).
 *
 * Purely additive; nothing is backfilled here. A NULL
 * `playability_checked_at` means "not checked yet", so libraries indexed before
 * this version are verified by the background job on the next run.
 * - `playability`: 'playable' | 'unsupported' | 'damaged' (NULL = unknown).
 * - `playability_reason`: ffprobe message or the offending codec/container.
 */
export const migration0011MediaPlayability: Migration = {
  id: 11,
  name: '0011-media-playability',
  up(db: SqliteDatabase): void {
    db.exec(`
      ALTER TABLE media_files ADD COLUMN playability TEXT
        CHECK (playability IS NULL OR playability IN ('playable', 'unsupported', 'damaged'));
      ALTER TABLE media_files ADD COLUMN playability_reason TEXT;
      ALTER TABLE media_files ADD COLUMN playability_checked_at TEXT;
      CREATE INDEX ix_media_files_playability ON media_files(media_type, playability_checked_at);
    `);
  },
  down(db: SqliteDatabase): void {
    db.exec(`DROP INDEX IF EXISTS ix_media_files_playability;`);
  },
};
