import type { TitleSource } from '../../../core/title-source';
import type { LibrarySourceStatus } from './entities';

/** Paging request shared by every read-side query. */
export interface Page {
  limit?: number;
  offset?: number;
}

export interface Paged<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface CourseSummary {
  id: string;
  title: string;
  sourceId: string | null;
  relativePath: string | null;
  titleSource: TitleSource;
  moduleCount: number;
  lessonCount: number;
  updatedAt: string;
}

export interface DocumentSummary {
  id: string;
  title: string;
  mediaFileId: string;
  titleSource: TitleSource;
  pageCount: number | null;
}

export interface SearchResult {
  courses: CourseSummary[];
  documents: DocumentSummary[];
}

export type CatalogSearchKind = 'course' | 'lesson' | 'movie' | 'document';
export type CatalogSearchFilter = 'all' | CatalogSearchKind;

/** Search hit prepared by the core, including its local path for navigation. */
export interface CatalogSearchHit {
  kind: CatalogSearchKind;
  itemId: string;
  lessonId?: string;
  moduleId?: string;
  courseId?: string;
  title: string;
  context: string;
  available: boolean;
  sourceId: string | null;
  relativePath: string | null;
  filePath: string | null;
}

export interface SourceIndexState {
  sourceId: string;
  status: LibrarySourceStatus;
  lastScanAt: string | null;
  mediaCount: number;
  courseCount: number;
}
