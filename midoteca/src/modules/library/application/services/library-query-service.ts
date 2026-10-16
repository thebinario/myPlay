import type { LibraryQueryStore } from '../../domain/repositories';
import type {
  CourseSummary,
  DocumentSummary,
  Page,
  Paged,
  SearchResult,
  SourceIndexState,
} from '../../domain/read-models';
import { listCourses } from '../queries/list-courses';
import { listDocuments } from '../queries/list-documents';
import { search } from '../queries/search';
import { getSourceIndexState } from '../queries/get-source-index-state';

/**
 * Read-side facade exposing paginated, transport-agnostic queries. It holds no
 * rules of its own: each operation is an explicit query under
 * `application/queries/`, and this class preserves the stable `Midoteca.queries`
 * surface while centralizing paging limits.
 */
export class LibraryQueryService {
  constructor(private readonly store: LibraryQueryStore) {}

  listCourses(query: Page & { sourceId?: string } = {}): Paged<CourseSummary> {
    return listCourses(this.store, query);
  }

  listDocuments(query: Page & { sourceId?: string } = {}): Paged<DocumentSummary> {
    return listDocuments(this.store, query);
  }

  search(text: string, query: Page = {}): SearchResult {
    return search(this.store, text, query);
  }

  getSourceIndexState(sourceId: string): SourceIndexState | null {
    return getSourceIndexState(this.store, sourceId);
  }
}
