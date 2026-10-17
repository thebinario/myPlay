import type { LibraryQueryStore } from '../../domain/repositories';
import type { CatalogSearchFilter, CatalogSearchHit, Page } from '../../domain/read-models';
import { normalizePage } from './paging';

/** Searches indexed catalog entities. Blank terms yield no results. */
export function search(
  store: LibraryQueryStore,
  text: string,
  query: Page & { filter?: CatalogSearchFilter } = {},
): CatalogSearchHit[] {
  const term = typeof text === 'string' ? text.trim() : '';
  if (term === '') return [];
  return store.search(term, { ...normalizePage(query), filter: query.filter ?? 'all' });
}
