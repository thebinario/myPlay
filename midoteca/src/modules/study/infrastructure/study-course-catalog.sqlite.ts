import type { SqliteDatabase } from '../../../platform/persistence/sqlite/database';
import type { NextLesson, StudyCourseCatalog } from '../domain/contracts';
import type { StudyCourseOption } from '../domain/course-options';

/** Label of the group holding courses that do not come from a library folder. */
export const LOOSE_COURSES_LABEL = 'Cursos avulsos';

const collator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });

/** Courses that come from a movie library are entertainment, not study. */
const STUDY_COURSE = `(c.source_id IS NULL OR NOT EXISTS (
  SELECT 1 FROM library_sources s WHERE s.id = c.source_id AND s.library_type = 'movie'))`;

/** Read-only view of the course catalog for the study planner. */
export class SqliteStudyCourseCatalog implements StudyCourseCatalog {
  constructor(private readonly db: SqliteDatabase) {}

  async courseTitle(courseId: string): Promise<string | null> {
    const row = this.db
      .prepare(`SELECT c.title FROM courses c WHERE c.id = ? AND ${STUDY_COURSE}`)
      .get(courseId) as { title: string } | undefined;
    return row?.title ?? null;
  }

  async courseOfLesson(lessonId: string): Promise<{ courseId: string; title: string } | null> {
    const row = this.db
      .prepare(
        `SELECT c.id AS courseId, c.title FROM lessons l
         JOIN course_modules m ON m.id = l.module_id
         JOIN courses c ON c.id = m.course_id
         WHERE l.id = ? AND ${STUDY_COURSE}`,
      )
      .get(lessonId) as { courseId: string; title: string } | undefined;
    return row ?? null;
  }

  async listCourses(): Promise<StudyCourseOption[]> {
    const rows = this.db
      .prepare(
        `SELECT c.id AS courseId, c.title, c.source_id AS sourceId,
                s.display_name AS displayName, s.root_path AS rootPath,
                col.title AS collectionTitle,
                (SELECT COUNT(*) FROM course_modules m WHERE m.course_id = c.id) AS moduleCount,
                (SELECT COUNT(*) FROM lessons l JOIN course_modules m ON m.id = l.module_id
                  WHERE m.course_id = c.id) AS lessonCount
           FROM courses c
           LEFT JOIN library_sources s ON s.id = c.source_id
           LEFT JOIN collections col ON col.id = c.collection_id
          WHERE ${STUDY_COURSE}`,
      )
      .all() as Array<
      Omit<StudyCourseOption, 'libraryName'> & {
        displayName: string | null;
        rootPath: string | null;
      }
    >;
    return rows
      .map(({ displayName, rootPath, ...row }) => ({
        ...row,
        libraryName:
          row.sourceId === null
            ? LOOSE_COURSES_LABEL
            : displayName?.trim() || lastSegment(rootPath ?? '') || 'Biblioteca',
      }))
      .sort(
        (a, b) =>
          Number(a.sourceId === null) - Number(b.sourceId === null) ||
          collator.compare(a.libraryName, b.libraryName) ||
          (a.sourceId ?? '').localeCompare(b.sourceId ?? '') ||
          collator.compare(a.collectionTitle ?? '', b.collectionTitle ?? '') ||
          collator.compare(a.title, b.title),
      );
  }

  async nextLesson(courseId: string): Promise<NextLesson | null> {
    const row = this.db
      .prepare(
        `SELECT l.id AS lessonId, l.title, m.title AS moduleTitle FROM lessons l
         JOIN course_modules m ON m.id = l.module_id
         LEFT JOIN playback_progress p ON p.lesson_id = l.id
         WHERE m.course_id = ? AND p.completed_at IS NULL
         ORDER BY m.sort_order, l.sort_order, l.title
         LIMIT 1`,
      )
      .get(courseId) as NextLesson | undefined;
    return row ?? null;
  }
}

function lastSegment(path: string): string {
  return (
    path
      .replace(/[\\/]+$/, '')
      .split(/[\\/]/)
      .pop() ?? ''
  );
}
