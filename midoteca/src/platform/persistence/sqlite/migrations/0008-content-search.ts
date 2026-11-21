import type { SqliteDatabase } from '../database';
import type { Migration } from './types';

/**
 * 0008 - content search (FTS5).
 *
 * Purely additive. Text extracted from PDFs, subtitles and (later) transcripts
 * is stored in `content_chunks`, keeping where it came from (page or time
 * range), and indexed by an external-content FTS5 table kept in sync by
 * triggers. `content_extraction_state` remembers which file version (size +
 * mtime) was indexed, so changed files are re-extracted and broken ones are
 * not retried until they change.
 */
export const migration0008ContentSearch: Migration = {
  id: 8,
  name: '0008-content-search',
  up(db: SqliteDatabase): void {
    db.exec(`
      CREATE TABLE content_chunks (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        media_file_id TEXT NOT NULL REFERENCES media_files(id) ON DELETE CASCADE,
        origin_key    TEXT NOT NULL,
        source_kind   TEXT NOT NULL CHECK (source_kind IN ('pdf','subtitle','transcript')),
        language      TEXT,
        page          INTEGER,
        start_ms      INTEGER,
        end_ms        INTEGER,
        text          TEXT NOT NULL
      );
      CREATE INDEX ix_content_chunks_origin ON content_chunks(media_file_id, origin_key);

      CREATE VIRTUAL TABLE content_chunks_fts USING fts5(
        text,
        content = 'content_chunks',
        content_rowid = 'id',
        tokenize = 'unicode61 remove_diacritics 2'
      );
      CREATE TRIGGER content_chunks_ai AFTER INSERT ON content_chunks BEGIN
        INSERT INTO content_chunks_fts(rowid, text) VALUES (new.id, new.text);
      END;
      CREATE TRIGGER content_chunks_ad AFTER DELETE ON content_chunks BEGIN
        INSERT INTO content_chunks_fts(content_chunks_fts, rowid, text)
        VALUES ('delete', old.id, old.text);
      END;
      CREATE TRIGGER content_chunks_au AFTER UPDATE ON content_chunks BEGIN
        INSERT INTO content_chunks_fts(content_chunks_fts, rowid, text)
        VALUES ('delete', old.id, old.text);
        INSERT INTO content_chunks_fts(rowid, text) VALUES (new.id, new.text);
      END;

      CREATE TABLE content_extraction_state (
        media_file_id TEXT NOT NULL REFERENCES media_files(id) ON DELETE CASCADE,
        origin_key    TEXT NOT NULL,
        fingerprint   TEXT NOT NULL,
        status        TEXT NOT NULL CHECK (status IN ('done','failed')),
        error         TEXT,
        updated_at    TEXT NOT NULL,
        PRIMARY KEY (media_file_id, origin_key)
      );
    `);
  },
  down(db: SqliteDatabase): void {
    db.exec(`
      DROP TABLE IF EXISTS content_extraction_state;
      DROP TRIGGER IF EXISTS content_chunks_au;
      DROP TRIGGER IF EXISTS content_chunks_ad;
      DROP TRIGGER IF EXISTS content_chunks_ai;
      DROP TABLE IF EXISTS content_chunks_fts;
      DROP TABLE IF EXISTS content_chunks;
    `);
  },
};
