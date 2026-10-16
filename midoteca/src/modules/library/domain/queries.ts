import type { TitleSource } from '../../../core/title-source';
import type { LibrarySourceStatus } from './entities';

/** Paging request shared by every read-side query. */
export interface Page {
  limit?: number;
  offset?: number;
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

export interface Paged<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface SearchResult {
  courses: CourseSummary[];
  documents: DocumentSummary[];
}

export interface SourceIndexState {
  sourceId: string;
  status: LibrarySourceStatus;
  lastScanAt: string | null;
  mediaCount: number;
  courseCount: number;
}

/**
 * Read-side port of the library context. It lives with the domain (and not with
 * the query service that consumes it) so adapters can implement it without
 * depending on `application/`.
 */
export interface LibraryQueryStore {
  listCourses(query: Page & { sourceId?: string }): Paged<CourseSummary>;
  listDocuments(query: Page & { sourceId?: string }): Paged<DocumentSummary>;
  search(text: string, query: Page): SearchResult;
  getSourceIndexState(sourceId: string): SourceIndexState | null;
}
