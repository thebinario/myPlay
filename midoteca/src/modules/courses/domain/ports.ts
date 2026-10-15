import type { Course, CourseModule, Lesson, LessonMedia } from './entities';
import type {
  CreateCourse,
  CreateCourseModule,
  CreateLesson,
  CreateLessonMedia,
  MoveLessonToModule,
  SaveCourseOrganization,
  UpdateCourse,
  UpdateCourseModule,
  UpdateLesson,
} from './inputs';

/** Fully materialized course tree, useful for the library/editor screens. */
export interface CourseTree {
  course: Course;
  modules: Array<CourseModule & { lessons: Array<Lesson & { media: LessonMedia[] }> }>;
}

/** Result of a cross-module lesson move. */
export interface LessonMoveResult {
  lesson: Lesson;
  sourceModuleId: string;
  targetModuleId: string;
}

export interface CourseRepository {
  create(input: CreateCourse): Promise<Course>;
  findById(id: string): Promise<Course | null>;
  findBySourceAndPath(sourceId: string, relativePath: string): Promise<Course | null>;
  listBySource(sourceId: string): Promise<Course[]>;
  list(): Promise<Course[]>;
  update(input: UpdateCourse): Promise<Course>;
  /** Deletes only catalog rows (modules/lessons cascade). Extra media persists. */
  delete(id: string): Promise<void>;

  createModule(input: CreateCourseModule): Promise<CourseModule>;
  findModuleById(id: string): Promise<CourseModule | null>;
  listModules(courseId: string): Promise<CourseModule[]>;
  /** Renames a module; a title change marks the row as a manual edit. */
  updateModule(input: UpdateCourseModule): Promise<CourseModule>;
  /** Catalog-only delete; the module's lessons cascade. Files are untouched. */
  deleteModule(id: string): Promise<void>;
  /** Atomically re-indexes the course modules to match `orderedIds`. */
  reorderModules(courseId: string, orderedIds: readonly string[]): Promise<CourseModule[]>;

  createLesson(input: CreateLesson): Promise<Lesson>;
  findLessonById(id: string): Promise<Lesson | null>;
  listLessons(moduleId: string): Promise<Lesson[]>;
  /** Renames a lesson; a title change marks the row as a manual edit. */
  updateLesson(input: UpdateLesson): Promise<Lesson>;
  /** Atomically re-indexes a module's lessons to match `orderedIds`. */
  reorderLessons(moduleId: string, orderedIds: readonly string[]): Promise<Lesson[]>;
  /** Atomically moves a lesson to another module of the same course. */
  moveLessonToModule(input: MoveLessonToModule): Promise<LessonMoveResult>;
  /**
   * Persists a whole-course organization snapshot (module order, titles,
   * lesson order and cross-module moves) in a single transaction.
   */
  saveOrganization(input: SaveCourseOrganization): Promise<CourseTree>;

  attachMedia(input: CreateLessonMedia): Promise<LessonMedia>;
  listLessonMedia(lessonId: string): Promise<LessonMedia[]>;
  detachMedia(lessonId: string, mediaFileId: string, role: string): Promise<void>;

  /** Loads a whole course aggregate in a single consistent read. */
  getTree(courseId: string): Promise<CourseTree | null>;
}
