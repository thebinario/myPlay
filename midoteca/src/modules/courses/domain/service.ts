import { NotFoundError } from '../../../core/errors';
import type { Course, CourseModule, Lesson } from './entities';
import type { SaveCourseOrganization } from './inputs';
import type { CourseRepository, CourseTree, LessonMoveResult } from './ports';

/**
 * Application service for the course-organization use cases. It is deliberately
 * thin: it owns orchestration and invariants that span more than one repository
 * call, while all atomic writes (and their transaction boundaries) live in the
 * `CourseRepository` adapter.
 *
 * No method here touches the filesystem. Renaming a course, module or lesson
 * only changes catalog rows; the original files keep their names.
 */
export class CourseOrganizationService {
  constructor(private readonly courses: CourseRepository) {}

  /** Renames a course. Persisted as a manual edit (never overwritten by scans). */
  async renameCourse(courseId: string, title: string): Promise<Course> {
    return this.courses.update({ id: courseId, title });
  }

  /** Renames a module. Persisted as a manual edit. */
  async renameModule(moduleId: string, title: string): Promise<CourseModule> {
    return this.courses.updateModule({ id: moduleId, title });
  }

  /** Renames a lesson. Persisted as a manual edit. */
  async renameLesson(lessonId: string, title: string): Promise<Lesson> {
    return this.courses.updateLesson({ id: lessonId, title });
  }

  /** Creates an empty module at the end of the course. */
  async createModule(courseId: string, title: string): Promise<CourseModule> {
    return this.courses.createModule({
      courseId,
      title,
      titleSource: 'manual',
      sortSource: 'manual',
    });
  }

  /** Removes a module (catalog only); its lessons cascade. Files are untouched. */
  async deleteModule(moduleId: string): Promise<void> {
    return this.courses.deleteModule(moduleId);
  }

  /** Reorders the course modules atomically. */
  async reorderModules(courseId: string, orderedIds: readonly string[]): Promise<CourseModule[]> {
    return this.courses.reorderModules(courseId, orderedIds);
  }

  /** Reorders the lessons of a module atomically. */
  async reorderLessons(moduleId: string, orderedIds: readonly string[]): Promise<Lesson[]> {
    return this.courses.reorderLessons(moduleId, orderedIds);
  }

  /** Moves a lesson to another module of the same course, atomically. */
  async moveLessonToModule(
    lessonId: string,
    targetModuleId: string,
    targetIndex?: number,
  ): Promise<LessonMoveResult> {
    return this.courses.moveLessonToModule({ lessonId, targetModuleId, targetIndex });
  }

  /**
   * Persists an entire organization snapshot (module order, module titles,
   * lesson order and cross-module moves) in one transaction. This is what the
   * editor's "Salvar" maps to.
   */
  async saveCourseOrganization(input: SaveCourseOrganization): Promise<CourseTree> {
    return this.courses.saveOrganization(input);
  }

  /** Returns the fully materialized course tree, or throws when missing. */
  async getCourseTree(courseId: string): Promise<CourseTree> {
    const tree = await this.courses.getTree(courseId);
    if (!tree) throw new NotFoundError(`Course ${courseId} not found`);
    return tree;
  }
}
