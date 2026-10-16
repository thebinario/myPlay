import type {
  CourseSummary,
  DocumentSummary,
  LibraryQueryStore,
  Page,
  Paged,
  SearchResult,
  SourceIndexState,
} from '../domain/queries';

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
