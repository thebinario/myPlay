import type { JsonObject } from '../shared/json';
import type { TitleSource } from '../shared/title-source';
import type { LessonMediaRole } from './entities';

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
  relativePath?: string | null;
  detectedTitle?: string | null;
  titleSource?: TitleSource;
}

export interface CreateLesson {
  id?: string;
  moduleId: string;
  title: string;
  sortOrder?: number;
  relativePath?: string | null;
  detectedTitle?: string | null;
  titleSource?: TitleSource;
}

export interface CreateLessonMedia {
  lessonId: string;
  mediaFileId: string;
  role: LessonMediaRole;
}
