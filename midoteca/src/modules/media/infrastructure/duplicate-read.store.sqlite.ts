import type { MediaType } from '../../../core/domain/media-type';
import type { SqliteDatabase } from '../../../platform/persistence/sqlite/database';
import type { DuplicateMember, DuplicateReadStore } from '../domain/analysis';

interface MemberRow {
  id: string;
  source_id: string;
  relative_path: string;
  media_type: MediaType;
  file_size: number | null;
  duration_ms: number | null;
}

interface LessonRow {
  media_file_id: string;
  lesson_id: string;
  lesson_title: string;
  course_id: string;
  course_title: string;
  watched_ms: number | null;
  duration_ms: number | null;
  completed_at: string | null;
}

/** Read model for duplicate groups: media, the lessons using them, progress. */
export class SqliteDuplicateReadStore implements DuplicateReadStore {
  constructor(private readonly db: SqliteDatabase) {}

  async listHashed(): Promise<Array<{ id: string; sha256: string | null }>> {
    return this.db
      .prepare(
        `SELECT id, sha256 FROM media_files
         WHERE sha256 IS NOT NULL AND availability = 'available'`,
      )
      .all() as Array<{ id: string; sha256: string }>;
  }

  async listLinks(): Promise<Array<{ a: string; b: string; similarity: number }>> {
    return this.db
      .prepare(
        `SELECT l.media_a AS a, l.media_b AS b, l.similarity
           FROM media_duplicate_links l
           JOIN media_files fa ON fa.id = l.media_a AND fa.availability = 'available'
           JOIN media_files fb ON fb.id = l.media_b AND fb.availability = 'available'`,
      )
      .all() as Array<{ a: string; b: string; similarity: number }>;
  }

  async describe(mediaFileIds: string[]): Promise<DuplicateMember[]> {
    if (mediaFileIds.length === 0) return [];
    const placeholders = mediaFileIds.map(() => '?').join(', ');
    const members = this.db
      .prepare(
        `SELECT id, source_id, relative_path, media_type, file_size, duration_ms
           FROM media_files WHERE id IN (${placeholders}) ORDER BY relative_path`,
      )
      .all(...mediaFileIds) as MemberRow[];
    const lessons = this.db
      .prepare(
        `SELECT lm.media_file_id, l.id AS lesson_id, l.title AS lesson_title,
                c.id AS course_id, c.title AS course_title,
                p.watched_ms, p.duration_ms, p.completed_at
           FROM lesson_media lm
           JOIN lessons l ON l.id = lm.lesson_id
           JOIN course_modules cm ON cm.id = l.module_id
           JOIN courses c ON c.id = cm.course_id
           LEFT JOIN playback_progress p ON p.lesson_id = l.id
          WHERE lm.role = 'primary' AND lm.media_file_id IN (${placeholders})
          ORDER BY c.title, l.title`,
      )
      .all(...mediaFileIds) as LessonRow[];
    const documents = this.db
      .prepare(
        `SELECT media_file_id, id AS document_id, title FROM documents
          WHERE media_file_id IN (${placeholders})`,
      )
      .all(...mediaFileIds) as Array<{ media_file_id: string; document_id: string; title: string }>;

    return members.map((row) => ({
      mediaFileId: row.id,
      sourceId: row.source_id,
      relativePath: row.relative_path,
      mediaType: row.media_type,
      fileSize: row.file_size,
      durationMs: row.duration_ms,
      lessons: lessons
        .filter((lesson) => lesson.media_file_id === row.id)
        .map((lesson) => ({
          lessonId: lesson.lesson_id,
          lessonTitle: lesson.lesson_title,
          courseId: lesson.course_id,
          courseTitle: lesson.course_title,
          watchedRatio:
            lesson.duration_ms && lesson.watched_ms !== null
              ? Math.min(1, lesson.watched_ms / lesson.duration_ms)
              : null,
          completedAt: lesson.completed_at,
        })),
      documents: documents
        .filter((document) => document.media_file_id === row.id)
        .map((document) => ({ documentId: document.document_id, title: document.title })),
    }));
  }

  async primaryMediaOf(lessonId: string): Promise<string | null> {
    const row = this.db
      .prepare(
        `SELECT media_file_id FROM lesson_media WHERE lesson_id = ? AND role = 'primary' LIMIT 1`,
      )
      .get(lessonId) as { media_file_id: string } | undefined;
    return row?.media_file_id ?? null;
  }
}
