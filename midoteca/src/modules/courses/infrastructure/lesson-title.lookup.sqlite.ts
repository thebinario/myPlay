import type { SqliteDatabase } from '../../../platform/persistence/sqlite/database';

/** Title of the lesson a media file belongs to (primary role first), or null. */
export class SqliteLessonTitleLookup {
  constructor(private readonly db: SqliteDatabase) {}

  async nameOf(mediaFileId: string): Promise<string | null> {
    const row = this.db
      .prepare(
        `SELECT l.title FROM lesson_media lm
           JOIN lessons l ON l.id = lm.lesson_id
          WHERE lm.media_file_id = ?
          ORDER BY lm.role = 'primary' DESC
          LIMIT 1`,
      )
      .get(mediaFileId) as { title: string } | undefined;
    return row?.title ?? null;
  }
}
