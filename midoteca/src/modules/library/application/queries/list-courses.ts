import type { LibraryQueryStore } from '../../domain/repositories';
import type { CourseSummary, Page, Paged } from '../../domain/read-models';
import { normalizePage } from './paging';

/** Paginated list of course summaries, optionally scoped to a source. */
export function listCourses(
  store: LibraryQueryStore,
  query: Page & { sourceId?: string } = {},
): Paged<CourseSummary> {
  return store.listCourses({ ...query, ...normalizePage(query) });
}
