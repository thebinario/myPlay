import type { SqliteDatabase } from '../database';
import type { Migration } from './types';

/**
 * 0002 - indexing & organization metadata.
 *
 * Adds the fields needed for incremental indexing without breaking Phase 1:
 * - `title_source` on editable entities records the provenance of a title so
 *   rescans never overwrite manual edits or manifests.
 * - `detected_title` keeps the last filesystem-derived title separately.
 * - `source_id` / `relative_path` give filesystem-derived entities a stable
 *   identity, preventing duplicate courses/modules/lessons on rescan.
 * - `media_files.last_seen_at` drives cheap "missing" detection (no full table
 *   scan, no deletion).
 * - `library_sources.display_name` is a friendly label independent of the path.
 *
 * Precedence for titles: manual > manifest > detected.
 */
export const migration0002Indexing: Migration = {
  id: 2,
  name: '0002-indexing',
  up(db: SqliteDatabase): void {
    db.exec(`
      ALTER TABLE library_sources ADD COLUMN display_name TEXT;

      ALTER TABLE media_files ADD COLUMN last_seen_at TEXT;

      ALTER TABLE courses ADD COLUMN source_id TEXT
        REFERENCES library_sources(id) ON DELETE CASCADE;
      ALTER TABLE courses ADD COLUMN relative_path TEXT;
      ALTER TABLE courses ADD COLUMN detected_title TEXT;
      ALTER TABLE courses ADD COLUMN title_source TEXT NOT NULL DEFAULT 'detected'
        CHECK (title_source IN ('detected','manual','manifest'));

      ALTER TABLE course_modules ADD COLUMN relative_path TEXT;
      ALTER TABLE course_modules ADD COLUMN detected_title TEXT;
      ALTER TABLE course_modules ADD COLUMN title_source TEXT NOT NULL DEFAULT 'detected'
        CHECK (title_source IN ('detected','manual','manifest'));

      ALTER TABLE lessons ADD COLUMN relative_path TEXT;
      ALTER TABLE lessons ADD COLUMN detected_title TEXT;
      ALTER TABLE lessons ADD COLUMN title_source TEXT NOT NULL DEFAULT 'detected'
        CHECK (title_source IN ('detected','manual','manifest'));

      ALTER TABLE documents ADD COLUMN detected_title TEXT;
      ALTER TABLE documents ADD COLUMN title_source TEXT NOT NULL DEFAULT 'detected'
        CHECK (title_source IN ('detected','manual','manifest'));

      CREATE UNIQUE INDEX ux_courses_source_path
        ON courses(source_id, relative_path) WHERE relative_path IS NOT NULL;
      CREATE UNIQUE INDEX ux_course_modules_course_path
        ON course_modules(course_id, relative_path) WHERE relative_path IS NOT NULL;
      CREATE UNIQUE INDEX ux_lessons_module_path
        ON lessons(module_id, relative_path) WHERE relative_path IS NOT NULL;
      CREATE INDEX ix_media_files_last_seen
        ON media_files(source_id, last_seen_at);
      CREATE INDEX ix_courses_source ON courses(source_id);
    `);
  },
  down(db: SqliteDatabase): void {
    // SQLite cannot drop columns prior to 3.35; recreate is out of scope for a
    // dev-only rollback. Drop the indexes and accept leftover columns.
    db.exec(`
      DROP INDEX IF EXISTS ux_courses_source_path;
      DROP INDEX IF EXISTS ux_course_modules_course_path;
      DROP INDEX IF EXISTS ux_lessons_module_path;
      DROP INDEX IF EXISTS ix_media_files_last_seen;
      DROP INDEX IF EXISTS ix_courses_source;
    `);
  },
};
