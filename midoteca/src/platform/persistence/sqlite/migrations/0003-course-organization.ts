import type { SqliteDatabase } from '../database';
import type { Migration } from './types';

/**
 * 0003 - course organization, document associations & reading state.
 *
 * Additive only (no destructive schema changes, no file operations):
 * - `sort_source` on modules/lessons records whether the current order was set
 *   by the user (`manual`) or derived from the filesystem (`detected`). This is
 *   the ordering counterpart of `title_source`, so rescans never clobber a
 *   manual reorganization.
 * - A unique index on `document_links` prevents the same link from being
 *   attached twice, regardless of which target (course/module/lesson) is set.
 * - `reading_progress.view_mode` / `completed_at` complete the reader state.
 */
export const migration0003CourseOrganization: Migration = {
  id: 3,
  name: '0003-course-organization',
  up(db: SqliteDatabase): void {
    db.exec(`
      ALTER TABLE course_modules ADD COLUMN sort_source TEXT NOT NULL DEFAULT 'detected'
        CHECK (sort_source IN ('detected','manual'));
      ALTER TABLE lessons ADD COLUMN sort_source TEXT NOT NULL DEFAULT 'detected'
        CHECK (sort_source IN ('detected','manual'));

      ALTER TABLE reading_progress ADD COLUMN view_mode TEXT;
      ALTER TABLE reading_progress ADD COLUMN completed_at TEXT;

      CREATE UNIQUE INDEX ux_document_links_target
        ON document_links(
          document_id,
          IFNULL(course_id, ''),
          IFNULL(module_id, ''),
          IFNULL(lesson_id, '')
        );
    `);
  },
  down(db: SqliteDatabase): void {
    // SQLite cannot drop columns prior to 3.35; a dev rollback only drops the
    // index and leaves the additive columns in place.
    db.exec(`DROP INDEX IF EXISTS ux_document_links_target;`);
  },
};
