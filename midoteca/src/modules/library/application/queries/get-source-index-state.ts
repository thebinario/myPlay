import type { LibraryQueryStore } from '../../domain/repositories';
import type { SourceIndexState } from '../../domain/read-models';

/** Current indexing state (status + counters) of a source, or null if unknown. */
export function getSourceIndexState(
  store: LibraryQueryStore,
  sourceId: string,
): SourceIndexState | null {
  return store.getSourceIndexState(sourceId);
}
