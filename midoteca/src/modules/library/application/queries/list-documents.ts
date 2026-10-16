import type { LibraryQueryStore } from '../../domain/repositories';
import type { DocumentSummary, Page, Paged } from '../../domain/read-models';
import { normalizePage } from './paging';

/** Paginated list of document summaries, optionally scoped to a source. */
export function listDocuments(
  store: LibraryQueryStore,
  query: Page & { sourceId?: string } = {},
): Paged<DocumentSummary> {
  return store.listDocuments({ ...query, ...normalizePage(query) });
}
