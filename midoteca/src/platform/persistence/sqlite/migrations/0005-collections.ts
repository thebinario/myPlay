import type { SqliteDatabase } from '../database';
import type { Migration } from './types';

/**
 * 0005 - collections & sections.
 *
 * Extends the course tree to the canonical hierarchy
 * Fonte → Coleção → Curso → Seção → Módulo → Aula. Purely additive:
 * - `collections` groups courses per source (e.g. "Coleção 01 - Tecnologia").
 * - `courses.collection_id` links a course to its collection (nullable).
 * - `course_sections` groups modules inside a course.
 * - `course_modules.section_id` links a module to its section (nullable).
 *
 * Deleting a collection only detaches its courses (SET NULL); courses keep
 * their own cascade through `source_id`.
 */
export const migration0005Collections: Migration = {
  id: 5,
  name: '0005-collections',
  up(db: SqliteDatabase): void {
    db.exec(`
      CREATE TABLE collections (
        id             TEXT PRIMARY KEY,
        source_id      TEXT NOT NULL REFERENCES library_sources(id) ON DELETE CASCADE,
        relative_path  TEXT NOT NULL,
        title          TEXT NOT NULL,
        detected_title TEXT,
        title_source   TEXT NOT NULL DEFAULT 'detected'
                         CHECK (title_source IN ('detected','manual','manifest')),
        sort_order     INTEGER NOT NULL DEFAULT 0,
        created_at     TEXT NOT NULL,
        updated_at     TEXT NOT NULL
      );
      CREATE UNIQUE INDEX ux_collections_source_path
        ON collections(source_id, relative_path);
      CREATE INDEX ix_collections_source ON collections(source_id);

      ALTER TABLE courses ADD COLUMN collection_id TEXT
        REFERENCES collections(id) ON DELETE SET NULL;
      ALTER TABLE courses ADD COLUMN category TEXT;
      ALTER TABLE courses ADD COLUMN provider TEXT;

      CREATE TABLE course_sections (
        id             TEXT PRIMARY KEY,
        course_id      TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        relative_path  TEXT,
        title          TEXT NOT NULL,
        detected_title TEXT,
        title_source   TEXT NOT NULL DEFAULT 'detected'
                         CHECK (title_source IN ('detected','manual','manifest')),
        sort_order     INTEGER NOT NULL DEFAULT 0,
        sort_source    TEXT NOT NULL DEFAULT 'detected'
                         CHECK (sort_source IN ('detected','manual'))
      );
      CREATE UNIQUE INDEX ux_course_sections_course_path
        ON course_sections(course_id, relative_path) WHERE relative_path IS NOT NULL;
      CREATE INDEX ix_course_sections_course
        ON course_sections(course_id, sort_order);

      ALTER TABLE course_modules ADD COLUMN section_id TEXT
        REFERENCES course_sections(id) ON DELETE SET NULL;
    `);
  },
  down(db: SqliteDatabase): void {
    // SQLite cannot drop columns prior to 3.35; a dev rollback only drops the
    // new tables/indexes and leaves the additive columns in place.
    db.exec(`
      DROP INDEX IF EXISTS ix_course_sections_course;
      DROP INDEX IF EXISTS ux_course_sections_course_path;
      DROP TABLE IF EXISTS course_sections;
      DROP INDEX IF EXISTS ix_collections_source;
      DROP INDEX IF EXISTS ux_collections_source_path;
      DROP TABLE IF EXISTS collections;
    `);
  },
};
