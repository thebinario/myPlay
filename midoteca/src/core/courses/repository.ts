import type { Course, CourseModule, Lesson, LessonMedia } from './entities';
import type {
  CreateCourse,
  CreateCourseModule,
  CreateLesson,
  CreateLessonMedia,
  UpdateCourse,
} from './inputs';

/** Fully materialized course tree, useful for the library/editor screens. */
export interface CourseTree {
  course: Course;
  modules: Array<CourseModule & { lessons: Array<Lesson & { media: LessonMedia[] }> }>;
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
  listModules(courseId: string): Promise<CourseModule[]>;

  createLesson(input: CreateLesson): Promise<Lesson>;
  findLessonById(id: string): Promise<Lesson | null>;
  listLessons(moduleId: string): Promise<Lesson[]>;

  attachMedia(input: CreateLessonMedia): Promise<LessonMedia>;
  listLessonMedia(lessonId: string): Promise<LessonMedia[]>;
  detachMedia(lessonId: string, mediaFileId: string, role: string): Promise<void>;

  /** Loads a whole course aggregate in a single consistent read. */
  getTree(courseId: string): Promise<CourseTree | null>;
}
