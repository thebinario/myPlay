import type { JsonObject } from '../shared/json';
import type { LessonMediaRole } from './entities';

export interface CreateCourse {
  id?: string;
  title: string;
  description?: string | null;
  metadata?: JsonObject | null;
}

export interface UpdateCourse {
  id: string;
  title?: string;
  description?: string | null;
  metadata?: JsonObject | null;
}

export interface CreateCourseModule {
  id?: string;
  courseId: string;
  title: string;
  sortOrder?: number;
}

export interface CreateLesson {
  id?: string;
  moduleId: string;
  title: string;
  sortOrder?: number;
}

export interface CreateLessonMedia {
  lessonId: string;
  mediaFileId: string;
  role: LessonMediaRole;
}
