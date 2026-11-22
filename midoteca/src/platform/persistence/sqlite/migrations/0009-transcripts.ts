import type { SqliteDatabase } from '../database';
import type { Migration } from './types';

/**
 * 0009 - local transcripts.
 *
 * Purely additive. Transcripts generated locally (Whisper) live in the
 * database, never next to the user's media:
 * - `media_transcripts`: one row per video with status, model, language and a
 *   `processed_ms` checkpoint so an interrupted transcription resumes.
 * - `transcript_segments`: timed text, served to the player as subtitles and
 *   indexed by the content search.
 */
export const migration0009Transcripts: Migration = {
  id: 9,
  name: '0009-transcripts',
  up(db: SqliteDatabase): void {
    db.exec(`
      CREATE TABLE media_transcripts (
        media_file_id TEXT PRIMARY KEY REFERENCES media_files(id) ON DELETE CASCADE,
        status        TEXT NOT NULL CHECK (status IN ('in_progress','done','failed')),
        model         TEXT NOT NULL,
        language      TEXT NOT NULL,
        processed_ms  INTEGER NOT NULL DEFAULT 0 CHECK (processed_ms >= 0),
        fingerprint   TEXT NOT NULL,
        error         TEXT,
        updated_at    TEXT NOT NULL
      );
      CREATE INDEX ix_media_transcripts_status ON media_transcripts(status);

      CREATE TABLE transcript_segments (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        media_file_id TEXT NOT NULL REFERENCES media_files(id) ON DELETE CASCADE,
        start_ms      INTEGER NOT NULL CHECK (start_ms >= 0),
        end_ms        INTEGER NOT NULL CHECK (end_ms >= start_ms),
        text          TEXT NOT NULL
      );
      CREATE INDEX ix_transcript_segments_media ON transcript_segments(media_file_id, start_ms);
    `);
  },
  down(db: SqliteDatabase): void {
    db.exec(`
      DROP TABLE IF EXISTS transcript_segments;
      DROP TABLE IF EXISTS media_transcripts;
    `);
  },
};
