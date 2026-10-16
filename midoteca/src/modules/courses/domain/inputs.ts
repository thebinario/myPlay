import type { LessonMediaRole } from '../../../core/domain/lesson-media-role';
import type { JsonObject } from '../../../core/json';
import type { SortSource } from '../../../core/sort-source';
import type { TitleSource } from '../../../core/title-source';

export interface CreateCourse {
  id?: string;
  title: string;
  description?: string | null;
  metadata?: JsonObject | null;
  sourceId?: string | null;
  relativePath?: string | null;
  detectedTitle?: string | null;
  titleSource?: TitleSource;
}

export interface UpdateCourse {
  id: string;
  title?: string;
  description?: string | null;
  metadata?: JsonObject | null;
  /** Explicit provenance when updating the title (defaults to `manual`). */
  titleSource?: TitleSource;
}

export interface CreateCourseModule {
  id?: string;
  courseId: string;
  title: string;
  sortOrder?: number;
  sortSource?: SortSource;
  relativePath?: string | null;
  detectedTitle?: string | null;
  titleSource?: TitleSource;
}

export interface CreateLesson {
  id?: string;
  moduleId: string;
  title: string;
  sortOrder?: number;
  sortSource?: SortSource;
  relativePath?: string | null;
  detectedTitle?: string | null;
  titleSource?: TitleSource;
}

export interface CreateLessonMedia {
  lessonId: string;
  mediaFileId: string;
  role: LessonMediaRole;
}

/** Renames/retitles a module. A title change is treated as a manual edit. */
export interface UpdateCourseModule {
  id: string;
  title?: string;
  titleSource?: TitleSource;
}

/** Renames/retitles a lesson. A title change is treated as a manual edit. */
export interface UpdateLesson {
  id: string;
  title?: string;
  titleSource?: TitleSource;
}

/** Moves a lesson into another module (same course), optionally at a position. */
export interface MoveLessonToModule {
  lessonId: string;
  targetModuleId: string;
  /** Insertion index in the target module; appended when omitted. */
  targetIndex?: number;
}

/** Desired per-module shape used by the bulk save operation. */
export interface OrganizationModuleInput {
  id: string;
  /** New title, when the user renamed the module. */
  title?: string;
  /** Full, ordered list of the module's lesson ids (may include moves in). */
  lessonIds: string[];
  lessonTitles?: Array<{ lessonId: string; title: string }>;
}

/**
 * Whole-course organization snapshot. Modules are given in display order and
 * each carries its ordered lesson ids, so reorders and cross-module moves are
 * persisted atomically in a single transaction.
 */
export interface SaveCourseOrganization {
  courseId: string;
  courseTitle?: string;
  modules: OrganizationModuleInput[];
}
