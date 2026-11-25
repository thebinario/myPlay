import type { StudyCourseOption } from './course-options';

/** Lesson to continue in a course track. */
export interface NextLesson {
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
  courseOfLesson(lessonId: string): Promise<{ courseId: string; title: string } | null>;
  /**
   * Every study course, ordered by library, collection and title (natural
   * order); courses created by hand ("Cursos avulsos") come last.
   */
  listCourses(): Promise<StudyCourseOption[]>;
  /** First lesson not completed yet, in course order. */
  nextLesson(courseId: string): Promise<NextLesson | null>;
}
