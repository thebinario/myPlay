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

  async courseOfLesson(
    lessonId: string,
  ): Promise<{ courseId: string; title: string; sourceId: string | null } | null> {
    const row = this.db
      .prepare(
        `SELECT c.id AS courseId, c.title, c.source_id AS sourceId FROM lessons l
         JOIN course_modules m ON m.id = l.module_id
         JOIN courses c ON c.id = m.course_id
         WHERE l.id = ? AND ${STUDY_COURSE}`,
      )
      .get(lessonId) as { courseId: string; title: string; sourceId: string | null } | undefined;
    return row ?? null;
  }

  async libraryName(sourceId: string): Promise<string | null> {
    const row = this.db
      .prepare(
        `SELECT display_name AS displayName, root_path AS rootPath FROM library_sources
          WHERE id = ? AND library_type <> 'movie'`,
      )
      .get(sourceId) as { displayName: string | null; rootPath: string } | undefined;
    if (!row) return null;
    return row.displayName?.trim() || lastSegment(row.rootPath) || 'Biblioteca';
  }

  async nextLessonInLibrary(sourceId: string): Promise<NextLesson | null> {
    const recent = this.db
      .prepare(
        `SELECT m.course_id AS courseId, MAX(p.updated_at) AS lastAt FROM playback_progress p
           JOIN lessons l ON l.id = p.lesson_id
           JOIN course_modules m ON m.id = l.module_id
           JOIN courses c ON c.id = m.course_id
          WHERE c.source_id = ?
          GROUP BY m.course_id ORDER BY lastAt DESC`,
      )
      .all(sourceId) as Array<{ courseId: string }>;
    const ordered = (await this.listCourses()).filter((course) => course.sourceId === sourceId);
    const candidates = [
      ...recent.map((row) => row.courseId),
      ...ordered.map((course) => course.courseId),
    ];
    for (const courseId of new Set(candidates)) {
      const next = await this.nextLesson(courseId);
      if (next) return next;
    }
    return null;
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
        `SELECT c.id AS courseId, c.title AS courseTitle, l.id AS lessonId, l.title,
                m.title AS moduleTitle FROM lessons l
         JOIN course_modules m ON m.id = l.module_id
         JOIN courses c ON c.id = m.course_id
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
