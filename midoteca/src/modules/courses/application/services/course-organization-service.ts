import type { Course, CourseModule, Lesson } from '../../domain/entities';
import type { SaveCourseOrganization as SaveCourseOrganizationInput } from '../../domain/inputs';
import type { CourseTree, LessonMoveResult } from '../../domain/ports';
import type { CourseOrganizationDependencies } from '../dto';
import { CreateModule } from '../use-cases/create-module';
import { DeleteModule } from '../use-cases/delete-module';
import { GetCourseTree } from '../use-cases/get-course-tree';
import { MoveLesson } from '../use-cases/move-lesson';
import { RenameCourse } from '../use-cases/rename-course';
import { RenameLesson } from '../use-cases/rename-lesson';
import { RenameModule } from '../use-cases/rename-module';
import { ReorderLessons } from '../use-cases/reorder-lessons';
import { ReorderModules } from '../use-cases/reorder-modules';
import { SaveOrganization } from '../use-cases/save-course-organization';

/**
 * Facade over the course-organization use cases. It holds no rules of its own:
 * every command is an explicit use case under `application/use-cases/`, and the
 * atomic writes live in the `CourseRepository` adapter.
 *
 * No method here touches the filesystem. Renaming a course, module or lesson
 * only changes catalog rows; the original files keep their names.
 */
export class CourseOrganizationService {
  private readonly renameCourseUseCase: RenameCourse;
  private readonly renameModuleUseCase: RenameModule;
  private readonly renameLessonUseCase: RenameLesson;
  private readonly createModuleUseCase: CreateModule;
  private readonly deleteModuleUseCase: DeleteModule;
  private readonly reorderModulesUseCase: ReorderModules;
  private readonly reorderLessonsUseCase: ReorderLessons;
  private readonly moveLessonUseCase: MoveLesson;
  private readonly saveOrganizationUseCase: SaveOrganization;
  private readonly getTreeUseCase: GetCourseTree;

  constructor(deps: CourseOrganizationDependencies) {
    this.renameCourseUseCase = new RenameCourse(deps);
    this.renameModuleUseCase = new RenameModule(deps);
    this.renameLessonUseCase = new RenameLesson(deps);
    this.createModuleUseCase = new CreateModule(deps);
    this.deleteModuleUseCase = new DeleteModule(deps);
    this.reorderModulesUseCase = new ReorderModules(deps);
    this.reorderLessonsUseCase = new ReorderLessons(deps);
    this.moveLessonUseCase = new MoveLesson(deps);
    this.saveOrganizationUseCase = new SaveOrganization(deps);
    this.getTreeUseCase = new GetCourseTree(deps);
  }

  /** Renames a course. Persisted as a manual edit (never overwritten by scans). */
  renameCourse(courseId: string, title: string): Promise<Course> {
    return this.renameCourseUseCase.execute(courseId, title);
  }

  /** Renames a module. Persisted as a manual edit. */
  renameModule(moduleId: string, title: string): Promise<CourseModule> {
    return this.renameModuleUseCase.execute(moduleId, title);
  }

  /** Renames a lesson. Persisted as a manual edit. */
  renameLesson(lessonId: string, title: string): Promise<Lesson> {
    return this.renameLessonUseCase.execute(lessonId, title);
  }

  /** Creates an empty module at the end of the course. */
  createModule(courseId: string, title: string): Promise<CourseModule> {
    return this.createModuleUseCase.execute(courseId, title);
  }

  /** Removes a module (catalog only); its lessons cascade. Files are untouched. */
  deleteModule(moduleId: string): Promise<void> {
    return this.deleteModuleUseCase.execute(moduleId);
  }

  /** Reorders the course modules atomically. */
  reorderModules(courseId: string, orderedIds: readonly string[]): Promise<CourseModule[]> {
    return this.reorderModulesUseCase.execute(courseId, orderedIds);
  }

  /** Reorders the lessons of a module atomically. */
  reorderLessons(moduleId: string, orderedIds: readonly string[]): Promise<Lesson[]> {
    return this.reorderLessonsUseCase.execute(moduleId, orderedIds);
  }

  /** Moves a lesson to another module of the same course, atomically. */
  moveLessonToModule(
    lessonId: string,
    targetModuleId: string,
    targetIndex?: number,
  ): Promise<LessonMoveResult> {
    return this.moveLessonUseCase.execute(lessonId, targetModuleId, targetIndex);
  }

  /**
   * Persists an entire organization snapshot (module order, module titles,
   * lesson order and cross-module moves) in one transaction. This is what the
   * editor's "Salvar" maps to.
   */
  saveCourseOrganization(input: SaveCourseOrganizationInput): Promise<CourseTree> {
    return this.saveOrganizationUseCase.execute(input);
  }

  /** Returns the fully materialized course tree, or throws when missing. */
  getCourseTree(courseId: string): Promise<CourseTree> {
    return this.getTreeUseCase.execute(courseId);
  }
}
