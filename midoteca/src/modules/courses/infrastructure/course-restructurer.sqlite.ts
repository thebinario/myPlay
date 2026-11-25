import { NotFoundError, ValidationError } from '../../../core/errors';
import { newId } from '../../../core/ids';
import type { SqliteDatabase } from '../../../platform/persistence/sqlite/database';
import {
  planDocumentTargets,
  suggestionCoversCourse,
  type SuggestedModule,
} from '../domain/organization-suggestion';
import type { CourseRestructurer } from '../domain/suggestion-ports';

interface LessonRow {
  id: string;
  title: string;
}

/**
 * Applies a new module layout in a single transaction. New modules are
 * manual (title and order), so a rescan never reshuffles them; lessons are
 * moved, never recreated; old modules are removed only after their materials
 * were re-linked. Catalog only: files stay untouched.
 */
export class SqliteCourseRestructurer implements CourseRestructurer {
  constructor(private readonly db: SqliteDatabase) {}

  async replaceModules(courseId: string, modules: readonly SuggestedModule[]): Promise<void> {
    this.db.transaction(() => {
      const course = this.db.prepare(`SELECT id FROM courses WHERE id = ?`).get(courseId);
      if (!course) throw new NotFoundError(`Course ${courseId} not found`);

      const oldModules = this.db
        .prepare(
          `SELECT id, section_id FROM course_modules WHERE course_id = ? ORDER BY sort_order`,
        )
        .all(courseId) as Array<{ id: string; section_id: string | null }>;
      const lessons = this.db
        .prepare(
          `SELECT l.id, l.title FROM lessons l
             JOIN course_modules m ON m.id = l.module_id
            WHERE m.course_id = ?`,
        )
        .all(courseId) as LessonRow[];
      if (
        !suggestionCoversCourse(
          modules,
          lessons.map((lesson) => lesson.id),
        )
      ) {
        throw new ValidationError('The new modules must cover every lesson of the course once');
      }

      const sectionId = oldModules.find((module) => module.section_id)?.section_id ?? null;
      const insertModule = this.db.prepare(
        `INSERT INTO course_modules
           (id, course_id, title, sort_order, sort_source, relative_path, detected_title, title_source, section_id)
         VALUES (?, ?, ?, ?, 'manual', NULL, ?, 'manual', ?)`,
      );
      const moveLesson = this.db.prepare(
        `UPDATE lessons SET module_id = ?, sort_order = ?, sort_source = 'manual' WHERE id = ?`,
      );
      const newIds = modules.map((module, index) => {
        const id = newId();
        insertModule.run(id, courseId, module.title, index, module.title, sectionId);
        module.lessonIds.forEach((lessonId, position) => moveLesson.run(id, position, lessonId));
        return id;
      });

      this.relinkDocuments(courseId, oldModules, modules, lessons, newIds);
      const removeModule = this.db.prepare(`DELETE FROM course_modules WHERE id = ?`);
      for (const module of oldModules) removeModule.run(module.id);
    });
  }

  private relinkDocuments(
    courseId: string,
    oldModules: ReadonlyArray<{ id: string }>,
    modules: readonly SuggestedModule[],
    lessons: readonly LessonRow[],
    newIds: readonly string[],
  ): void {
    if (oldModules.length === 0) return;
    const documents = this.db
      .prepare(
        `SELECT DISTINCT dl.document_id AS documentId, COALESCE(d.title, '') AS title
           FROM document_links dl
           JOIN documents d ON d.id = dl.document_id
          WHERE dl.module_id IN (SELECT value FROM json_each(?))`,
      )
      .all(JSON.stringify(oldModules.map((module) => module.id))) as Array<{
      documentId: string;
      title: string;
    }>;
    const titles = new Map(lessons.map((lesson) => [lesson.id, lesson.title]));
    const targets = planDocumentTargets(
      modules.map((module) => ({
        lessons: module.lessonIds.map((id) => ({ title: titles.get(id) ?? '' })),
      })),
      documents,
    );
    const exists = this.db.prepare(
      `SELECT 1 FROM document_links
        WHERE document_id = ? AND module_id IS ? AND course_id IS ? AND lesson_id IS NULL`,
    );
    const link = this.db.prepare(
      `INSERT INTO document_links (id, document_id, course_id, module_id) VALUES (?, ?, ?, ?)`,
    );
    for (const { documentId, moduleIndex } of targets) {
      const moduleId = moduleIndex === null ? null : newIds[moduleIndex];
      const target = moduleId ? { courseId: null, moduleId } : { courseId, moduleId: null };
      if (!exists.get(documentId, target.moduleId, target.courseId)) {
        link.run(newId(), documentId, target.courseId, target.moduleId);
      }
    }
  }
}
