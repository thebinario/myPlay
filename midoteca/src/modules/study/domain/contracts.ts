import type { StudyCourseOption } from './course-options';

/** Lesson to continue in a course track. */
export interface NextLesson {
  courseId: string;
  courseTitle: string;
  lessonId: string;
  title: string;
  moduleTitle: string;
}

/**
 * What the study context needs from the library catalog. Read-only; the
 * adapter reads the courses/progress tables without touching their rules.
 */
export interface StudyCourseCatalog {
  /** Title of a study course (movie libraries excluded), or null. */
  courseTitle(courseId: string): Promise<string | null>;
  /** Course of a lesson, when the lesson belongs to a study course. */
  courseOfLesson(
    lessonId: string,
  ): Promise<{ courseId: string; title: string; sourceId: string | null } | null>;
  /** Display name of a study library (movie libraries excluded), or null. */
  libraryName(sourceId: string): Promise<string | null>;
  /**
   * Where to continue in a library: the next lesson of the course watched most
   * recently that still has lessons left, else of the first unfinished course.
   */
  nextLessonInLibrary(sourceId: string): Promise<NextLesson | null>;
  /**
   * Every study course, ordered by library, collection and title (natural
   * order); courses created by hand ("Cursos avulsos") come last.
   */
  listCourses(): Promise<StudyCourseOption[]>;
  /** First lesson not completed yet, in course order. */
  nextLesson(courseId: string): Promise<NextLesson | null>;
}
