import type { SqliteDatabase } from '../database';
import type { Migration } from './types';

/**
 * 0001 - initial Midoteca catalog schema.
 *
 * Design notes:
 * - Every entity uses a TEXT UUID primary key; physical paths are never keys.
 * - Timestamps are ISO-8601 UTC TEXT.
 * - Deletion cascades remove *catalog* rows only. No migration ever deletes a
 *   file on disk; that rule is enforced at the repository/application layer.
 * - sha256 is indexed but NOT unique (duplicate content is allowed and useful).
 */
export const migration0001InitialSchema: Migration = {
  id: 1,
  name: '0001-initial-schema',
  up(db: SqliteDatabase): void {
    db.exec(`
      -- ── library ───────────────────────────────────────────────────────────
      CREATE TABLE library_sources (
        id           TEXT PRIMARY KEY,
        root_path    TEXT NOT NULL,
        volume_id    TEXT,
        status       TEXT NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active','offline','scanning','error')),
        last_scan_at TEXT,
        created_at   TEXT NOT NULL,
        updated_at   TEXT NOT NULL
      );
      CREATE UNIQUE INDEX ux_library_sources_volume_id
        ON library_sources(volume_id) WHERE volume_id IS NOT NULL;
      CREATE INDEX ix_library_sources_status ON library_sources(status);

      -- ── media ─────────────────────────────────────────────────────────────
      CREATE TABLE media_files (
        id            TEXT PRIMARY KEY,
        source_id     TEXT NOT NULL
                        REFERENCES library_sources(id) ON DELETE CASCADE,
        relative_path TEXT NOT NULL,
        media_type    TEXT NOT NULL
                        CHECK (media_type IN ('video','audio','pdf','subtitle','image','other')),
        file_size     INTEGER CHECK (file_size IS NULL OR file_size >= 0),
        duration_ms   INTEGER CHECK (duration_ms IS NULL OR duration_ms >= 0),
        modified_at   TEXT,
        sha256        TEXT CHECK (sha256 IS NULL OR length(sha256) = 64),
        availability  TEXT NOT NULL DEFAULT 'unverified'
                        CHECK (availability IN ('available','missing','unverified')),
        created_at    TEXT NOT NULL,
        updated_at    TEXT NOT NULL,
        UNIQUE (source_id, relative_path)
      );
      CREATE INDEX ix_media_files_source       ON media_files(source_id);
      CREATE INDEX ix_media_files_sha256       ON media_files(sha256);
      CREATE INDEX ix_media_files_type         ON media_files(media_type);
      CREATE INDEX ix_media_files_availability ON media_files(availability);

      CREATE TABLE media_tracks (
        id            TEXT PRIMARY KEY,
        media_file_id TEXT NOT NULL
                        REFERENCES media_files(id) ON DELETE CASCADE,
        kind          TEXT NOT NULL
                        CHECK (kind IN ('subtitle','audio','video','chapter','attachment')),
        language      TEXT,
        path          TEXT,
        metadata      TEXT
      );
      CREATE INDEX ix_media_tracks_media ON media_tracks(media_file_id);

      -- ── courses ───────────────────────────────────────────────────────────
      CREATE TABLE courses (
        id          TEXT PRIMARY KEY,
        title       TEXT NOT NULL,
        description TEXT,
        metadata    TEXT,
        created_at  TEXT NOT NULL,
        updated_at  TEXT NOT NULL
      );

      CREATE TABLE course_modules (
        id         TEXT PRIMARY KEY,
        course_id  TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        title      TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX ix_course_modules_course ON course_modules(course_id, sort_order);

      CREATE TABLE lessons (
        id         TEXT PRIMARY KEY,
        module_id  TEXT NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
        title      TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX ix_lessons_module ON lessons(module_id, sort_order);

      CREATE TABLE lesson_media (
        lesson_id     TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
        media_file_id TEXT NOT NULL REFERENCES media_files(id) ON DELETE CASCADE,
        role          TEXT NOT NULL
                        CHECK (role IN ('primary','supplementary','attachment','subtitle')),
        PRIMARY KEY (lesson_id, media_file_id, role)
      );
      CREATE INDEX ix_lesson_media_media ON lesson_media(media_file_id);

      -- ── documents ─────────────────────────────────────────────────────────
      CREATE TABLE documents (
        id            TEXT PRIMARY KEY,
        media_file_id TEXT NOT NULL UNIQUE
                        REFERENCES media_files(id) ON DELETE CASCADE,
        title         TEXT NOT NULL,
        page_count    INTEGER CHECK (page_count IS NULL OR page_count >= 0)
      );

      CREATE TABLE document_links (
        id          TEXT PRIMARY KEY,
        document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        course_id   TEXT REFERENCES courses(id) ON DELETE CASCADE,
        module_id   TEXT REFERENCES course_modules(id) ON DELETE CASCADE,
        lesson_id   TEXT REFERENCES lessons(id) ON DELETE CASCADE,
        CHECK (course_id IS NOT NULL OR module_id IS NOT NULL OR lesson_id IS NOT NULL)
      );
      CREATE INDEX ix_document_links_document ON document_links(document_id);
      CREATE INDEX ix_document_links_course   ON document_links(course_id);
      CREATE INDEX ix_document_links_module   ON document_links(module_id);
      CREATE INDEX ix_document_links_lesson   ON document_links(lesson_id);

      -- ── progress ──────────────────────────────────────────────────────────
      CREATE TABLE playback_progress (
        id           TEXT PRIMARY KEY,
        lesson_id    TEXT NOT NULL UNIQUE REFERENCES lessons(id) ON DELETE CASCADE,
        position_ms  INTEGER NOT NULL DEFAULT 0 CHECK (position_ms >= 0),
        duration_ms  INTEGER CHECK (duration_ms IS NULL OR duration_ms >= 0),
        completed_at TEXT,
        updated_at   TEXT NOT NULL
      );

      CREATE TABLE reading_progress (
        id           TEXT PRIMARY KEY,
        document_id  TEXT NOT NULL UNIQUE REFERENCES documents(id) ON DELETE CASCADE,
        page         INTEGER NOT NULL DEFAULT 1 CHECK (page >= 1),
        scroll_ratio REAL NOT NULL DEFAULT 0 CHECK (scroll_ratio >= 0 AND scroll_ratio <= 1),
        zoom         REAL NOT NULL DEFAULT 1 CHECK (zoom > 0),
        theme        TEXT,
        updated_at   TEXT NOT NULL
      );

      -- ── jobs ──────────────────────────────────────────────────────────────
      CREATE TABLE jobs (
        id         TEXT PRIMARY KEY,
        type       TEXT NOT NULL,
        status     TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','running','paused','completed','failed','cancelled')),
        priority   INTEGER NOT NULL DEFAULT 0,
        payload    TEXT,
        checkpoint TEXT,
        attempts   INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX ix_jobs_status_priority ON jobs(status, priority DESC, created_at);

      -- ── settings ──────────────────────────────────────────────────────────
      CREATE TABLE app_settings (
        key        TEXT PRIMARY KEY,
        value      TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  },
  down(db: SqliteDatabase): void {
    db.exec(`
      DROP TABLE IF EXISTS app_settings;
      DROP TABLE IF EXISTS jobs;
      DROP TABLE IF EXISTS reading_progress;
      DROP TABLE IF EXISTS playback_progress;
      DROP TABLE IF EXISTS document_links;
      DROP TABLE IF EXISTS documents;
      DROP TABLE IF EXISTS lesson_media;
      DROP TABLE IF EXISTS lessons;
      DROP TABLE IF EXISTS course_modules;
      DROP TABLE IF EXISTS courses;
      DROP TABLE IF EXISTS media_tracks;
      DROP TABLE IF EXISTS media_files;
      DROP TABLE IF EXISTS library_sources;
    `);
  },
};
