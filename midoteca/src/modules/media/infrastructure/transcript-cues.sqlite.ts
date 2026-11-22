import type { Cue } from '../../../core/domain/subtitles';
import type { SqliteDatabase } from '../../../platform/persistence/sqlite/database';

/** Reads a finished transcript as cues (used by the player and the search). */
export class SqliteTranscriptCueReader {
  constructor(private readonly db: SqliteDatabase) {}

  async readCues(mediaFileId: string): Promise<Cue[]> {
    return this.db
      .prepare(
        `SELECT s.start_ms AS startMs, s.end_ms AS endMs, s.text
           FROM transcript_segments s
           JOIN media_transcripts t ON t.media_file_id = s.media_file_id AND t.status = 'done'
          WHERE s.media_file_id = ?
          ORDER BY s.start_ms, s.id`,
      )
      .all(mediaFileId) as Cue[];
  }
}
