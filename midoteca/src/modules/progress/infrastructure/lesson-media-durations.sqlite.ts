import type { SqliteDatabase } from '../../../platform/persistence/sqlite/database';
import type { LessonMediaDurations } from '../domain/ports';

/** Reads `media_files.duration_ms` of the lesson's primary media (probed). */
export class SqliteLessonMediaDurations implements LessonMediaDurations {
  constructor(private readonly db: SqliteDatabase) {}

  async primaryDurationMs(lessonId: string): Promise<number | null> {
    const row = this.db
      .prepare(
        `SELECT mf.duration_ms AS duration_ms
           FROM lesson_media lm
           JOIN media_files mf ON mf.id = lm.media_file_id
          WHERE lm.lesson_id = ? AND lm.role = 'primary' AND mf.duration_ms > 0
          LIMIT 1`,
      )
      .get(lessonId) as { duration_ms: number } | undefined;
    return row?.duration_ms ?? null;
  }
}
