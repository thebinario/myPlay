import type { Course, CourseModule, CourseSection, Lesson, LessonMedia } from './entities';
import type { TitleSource } from '../../../core/title-source';
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
  /** Aggregates used by the catalog card, computed by the read-side backend. */
  totalDurationSeconds: number;
  pdfCount: number;
  /** Completion percentage across the course lessons and linked library PDFs. */
  completionPercentage: number;
  documents: CourseTreeDocument[];
  /** Flat projection of every module (legacy consumers keep working). */
  modules: CourseTreeModule[];
  /** Modules grouped by section, when the course is organized into sections. */
  sections: CourseTreeSection[];
}

export type CourseTreeModule = CourseModule & {
  documents: CourseTreeDocument[];
  lessons: Array<Lesson & { media: LessonMedia[] }>;
};

export interface CourseTreeSection extends CourseSection {
  modules: CourseTreeModule[];
}

/** Read-only document projection included in the course aggregate. */
export interface CourseTreeDocument {
  id: string;
  mediaFileId: string;
  title: string;
  pageCount: number | null;
  titleSource: TitleSource;
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
