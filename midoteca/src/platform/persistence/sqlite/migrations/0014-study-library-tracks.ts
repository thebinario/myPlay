import type { SqliteDatabase } from '../database';
import type { Migration } from './types';

/**
 * 0014 - Study tracks for a whole library.
 *
 * Purely additive: a course track may point to a library (`source_id`) instead
 * of a single course. Removing the library only clears the link; the track and
 * its time log stay. At most one active track per library.
 */
export const migration0014StudyLibraryTracks: Migration = {
  id: 14,
  name: '0014-study-library-tracks',
  up(db: SqliteDatabase): void {
    db.exec(`
      ALTER TABLE study_tracks ADD COLUMN source_id TEXT
        REFERENCES library_sources(id) ON DELETE SET NULL;
      CREATE UNIQUE INDEX ux_study_tracks_active_source
        ON study_tracks(source_id) WHERE source_id IS NOT NULL AND archived_at IS NULL;
    `);
  },
  down(db: SqliteDatabase): void {
    db.exec(`
      DROP INDEX IF EXISTS ux_study_tracks_active_source;
      ALTER TABLE study_tracks DROP COLUMN source_id;
    `);
  },
};
