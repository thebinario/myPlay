import type { LibraryQueryStore } from '../../domain/repositories';
import type { CollectionSummary, Page, Paged } from '../../domain/read-models';
import { normalizePage } from './paging';

/** Paginated list of collection summaries, optionally scoped to a source. */
export function listCollections(
  store: LibraryQueryStore,
  query: Page & { sourceId?: string } = {},
): Paged<CollectionSummary> {
  return store.listCollections({ ...query, ...normalizePage(query) });
}
