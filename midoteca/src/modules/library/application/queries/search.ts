import type { LibraryQueryStore } from '../../domain/repositories';
import type { Page, SearchResult } from '../../domain/read-models';
import { normalizePage } from './paging';

/** Title search across courses and documents. Blank terms yield empty results. */
export function search(store: LibraryQueryStore, text: string, query: Page = {}): SearchResult {
  const term = typeof text === 'string' ? text.trim() : '';
  if (term === '') return { courses: [], documents: [] };
  return store.search(term, normalizePage(query));
}
