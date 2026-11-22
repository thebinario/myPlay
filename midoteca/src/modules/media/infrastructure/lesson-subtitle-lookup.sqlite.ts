import { isAbsolute, join } from 'node:path';
import type { SqliteDatabase } from '../../../platform/persistence/sqlite/database';
import type {
  LessonSubtitleLookup,
  LessonSubtitleSources,
} from '../application/lesson-subtitles.service';
import { languageCode } from '../domain/transcription';

/** Finds subtitle tracks and the finished transcript of a lesson's primary media. */
export class SqliteLessonSubtitleLookup implements LessonSubtitleLookup {
  constructor(private readonly db: SqliteDatabase) {}

  async find(lessonId: string): Promise<LessonSubtitleSources> {
    const media = this.db
      .prepare(
        `SELECT mf.id, ls.root_path FROM lesson_media lm
           JOIN media_files mf ON mf.id = lm.media_file_id
           JOIN library_sources ls ON ls.id = mf.source_id
          WHERE lm.lesson_id = ? AND lm.role = 'primary' LIMIT 1`,
      )
      .get(lessonId) as { id: string; root_path: string } | undefined;
    if (!media) return { files: [], transcript: null };

    const files = (
      this.db
        .prepare(
          `SELECT id, language, path FROM media_tracks
            WHERE media_file_id = ? AND kind = 'subtitle' AND path IS NOT NULL
              AND (metadata IS NULL OR json_extract(metadata, '$.generated') IS NOT 1)
            ORDER BY language, path`,
        )
        .all(media.id) as Array<{ id: string; language: string | null; path: string }>
    ).map((row) => ({
      trackId: row.id,
      language: row.language ? row.language.split('-')[0] : null,
      absolutePath: isAbsolute(row.path) ? row.path : join(media.root_path, row.path),
    }));

    const transcript = this.db
      .prepare(`SELECT language FROM media_transcripts WHERE media_file_id = ? AND status = 'done'`)
      .get(media.id) as { language: string } | undefined;

    return {
      files,
      transcript: transcript
        ? { mediaFileId: media.id, language: languageCode(transcript.language) }
        : null,
    };
  }
}
