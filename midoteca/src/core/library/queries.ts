import type { TitleSource } from '../shared/title-source';
import type { LibrarySourceStatus } from './entities';

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

export interface LibraryQueryStore {
  listCourses(query: Page & { sourceId?: string }): Paged<CourseSummary>;
  listDocuments(query: Page & { sourceId?: string }): Paged<DocumentSummary>;
  search(text: string, query: Page): SearchResult;
  getSourceIndexState(sourceId: string): SourceIndexState | null;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function normalizePage(query: Page): { limit: number; offset: number } {
  const limit = Math.min(Math.max(Math.trunc(query.limit ?? DEFAULT_LIMIT), 1), MAX_LIMIT);
  const offset = Math.max(Math.trunc(query.offset ?? 0), 0);
  return { limit, offset };
}

/**
 * Read-side service exposing paginated, transport-agnostic queries. Keeps the
 * UI from issuing ad-hoc SQL and centralizes paging limits.
 */
export class LibraryQueryService {
  constructor(private readonly store: LibraryQueryStore) {}

  listCourses(query: Page & { sourceId?: string } = {}): Paged<CourseSummary> {
    return this.store.listCourses({
      ...query,
      ...normalizePage(query),
    });
  }

  listDocuments(query: Page & { sourceId?: string } = {}): Paged<DocumentSummary> {
    return this.store.listDocuments({
      ...query,
      ...normalizePage(query),
    });
  }

  search(text: string, query: Page = {}): SearchResult {
    const term = typeof text === 'string' ? text.trim() : '';
    if (term === '') return { courses: [], documents: [] };
    return this.store.search(term, normalizePage(query));
  }

  getSourceIndexState(sourceId: string): SourceIndexState | null {
    return this.store.getSourceIndexState(sourceId);
  }
}
