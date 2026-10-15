import type { LessonMediaRole } from '../courses/entities';
import type { MediaType } from '../media/entities';
import type { TitleSource } from '../shared/title-source';
import type { CourseManifest } from './manifest';

/**
 * Persistence port for indexing. Methods are intentionally synchronous: the
 * indexer batches work inside `transaction(...)`, and the SQLite driver
 * (better-sqlite3) is synchronous. Async repositories are not used here to
 * avoid interleaving with the batch transaction.
 */
export interface MediaIndexRecord {
  id: string;
  sourceId: string;
  relativePath: string;
  mediaType: MediaType;
  fileSize: number | null;
  modifiedAt: string | null;
}

export interface MediaTouch {
  relativePath: string;
  fileSize: number | null;
  modifiedAt: string | null;
  runToken: string;
}

export interface MediaInsert extends MediaTouch {
  sourceId: string;
  mediaType: MediaType;
}

export interface UpsertTitleInput {
  relativePath: string;
  detectedTitle: string;
  manifestTitle?: string | null;
  sortOrder?: number;
}

export interface UpsertCourseInput extends UpsertTitleInput {
  sourceId: string;
}

export interface UpsertModuleInput extends UpsertTitleInput {
  courseId: string;
}

export interface UpsertLessonInput extends UpsertTitleInput {
  moduleId: string;
}

export interface UpsertDocumentInput {
  mediaFileId: string;
  detectedTitle: string;
  manifestTitle?: string | null;
}

export interface UpsertTitleResult {
  id: string;
  title: string;
  titleSource: TitleSource;
  created: boolean;
}

export interface LinkDocumentInput {
  documentId: string;
  courseId?: string | null;
  moduleId?: string | null;
  lessonId?: string | null;
}

export interface AddTrackInput {
  mediaFileId: string;
  kind: 'subtitle' | 'audio';
  language: string | null;
  path: string | null;
}

export interface IndexingStore {
  transaction<T>(fn: () => T): T;

  findMediaByPath(sourceId: string, relativePath: string): MediaIndexRecord | null;
  findMoveCandidate(
    sourceId: string,
    fileSize: number | null,
    modifiedAt: string | null,
    runToken: string,
  ): MediaIndexRecord | null;
  insertMedia(input: MediaInsert): string;
  touchMedia(id: string, input: MediaTouch): void;
  markMissing(sourceId: string, runToken: string): string[];

  upsertCourse(input: UpsertCourseInput): UpsertTitleResult;
  upsertModule(input: UpsertModuleInput): UpsertTitleResult;
  upsertLesson(input: UpsertLessonInput): UpsertTitleResult;
  linkLessonMedia(lessonId: string, mediaFileId: string, role: LessonMediaRole): void;
  upsertDocument(input: UpsertDocumentInput): UpsertTitleResult;
  linkDocument(input: LinkDocumentInput): void;
  addMediaTrack(input: AddTrackInput): void;
}

export interface SourceProbe {
  /** Whether the path exists, is a directory, and is readable. */
  inspect(path: string): Promise<{
    exists: boolean;
    isDirectory: boolean;
    readable: boolean;
  }>;
  /** Stable-ish volume identity for the path, or null when unknown. */
  volumeId(path: string): Promise<string | null>;
}

export interface ManifestLoader {
  /** Reads `.midoteca/course.json` under `courseDir`, if present. */
  load(courseDir: string): Promise<CourseManifest | null>;
}
