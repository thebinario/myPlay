import type { SqliteDatabase } from '../database';
import type { Migration } from './types';

/**
 * 0006 - watch coverage.
 *
 * Purely additive. `playback_progress` records which spans of the media were
 * really played, so the backend (not the renderer) decides completion:
 * - `watched_ms` total media time really played.
 * - `watched_intervals` JSON array of `{fromMs, toMs}` spans.
 * - `completion_source` who completed the lesson. Rows completed before this
 *   migration are tagged `legacy`; existing positions are preserved.
 */
export const migration0006WatchCoverage: Migration = {
  id: 6,
  name: '0006-watch-coverage',
  up(db: SqliteDatabase): void {
    db.exec(`
      ALTER TABLE playback_progress
        ADD COLUMN watched_ms INTEGER NOT NULL DEFAULT 0 CHECK (watched_ms >= 0);
      ALTER TABLE playback_progress ADD COLUMN watched_intervals TEXT;
      ALTER TABLE playback_progress ADD COLUMN completion_source TEXT
        CHECK (completion_source IS NULL
               OR completion_source IN ('watched','manual','duplicate','legacy'));

      UPDATE playback_progress
         SET completion_source = 'legacy'
       WHERE completed_at IS NOT NULL;
    `);
  },
  down(): void {
    // Additive columns are left in place (SQLite < 3.35 cannot drop columns).
  },
};
