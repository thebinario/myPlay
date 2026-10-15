import type { JsonObject } from '../shared/json';

/**
 * A `Course` is a logical container. It is intentionally decoupled from any
 * physical file: its lessons are linked to media files through `LessonMedia`,
 * so a course survives renames, remounts and re-encodes of its files.
 */
export interface Course {
  id: string;
  title: string;
  description: string | null;
  /** Free-form extensible data (tags, cover, external ids, ...). */
  metadata: JsonObject | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Named `CourseModule` in the domain (rather than the spec's `Module`) to avoid
 * clashing with ES/Node module terminology. Table: `course_modules`.
 */
export interface CourseModule {
  id: string;
  courseId: string;
  title: string;
  sortOrder: number;
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  sortOrder: number;
}

/**
 * Role a media file plays within a lesson. A lesson may reference many files,
 * and the same file may appear in several lessons.
 */
export type LessonMediaRole =
  | 'primary'
  | 'supplementary'
  | 'attachment'
  | 'subtitle';

export interface LessonMedia {
  lessonId: string;
  mediaFileId: string;
  role: LessonMediaRole;
}

export const LESSON_MEDIA_ROLES: readonly LessonMediaRole[] = [
  'primary',
  'supplementary',
  'attachment',
  'subtitle',
];
