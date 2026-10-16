import type { LessonMediaRole } from '../../../core/domain/lesson-media-role';
import type { JsonObject } from '../../../core/json';
import type { TitleSource } from '../../../core/title-source';

/**
 * A `Course` is a logical container. It is intentionally decoupled from any
 * physical file: its lessons are linked to media files through `LessonMedia`,
 * so a course survives renames, remounts and re-encodes of its files.
 *
 * Courses discovered from the filesystem carry `sourceId` + `relativePath`
 * (their stable identity) and a `titleSource`. Manually created courses leave
 * those null.
 */
export interface Course {
  id: string;
  title: string;
  description: string | null;
  /** Free-form extensible data (tags, cover, external ids, ...). */
  metadata: JsonObject | null;
  /** Owning library source for discovered courses; null for manual ones. */
  sourceId: string | null;
  /** Path relative to the source root; null for manual courses. */
  relativePath: string | null;
  /** Last title derived from the filesystem; null for manual courses. */
  detectedTitle: string | null;
  titleSource: TitleSource;
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
  relativePath: string | null;
  detectedTitle: string | null;
  titleSource: TitleSource;
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  sortOrder: number;
  relativePath: string | null;
  detectedTitle: string | null;
  titleSource: TitleSource;
}

export interface LessonMedia {
  lessonId: string;
  mediaFileId: string;
  role: LessonMediaRole;
}
