import type { LibraryQueryStore } from '../../domain/repositories';
import type { CollectionTree } from '../../domain/read-models';

/**
 * Full collection tree (courses → sections → modules) for a single collection.
 * Returns null when the collection does not exist.
 */
export function getCollectionTree(
  store: LibraryQueryStore,
  collectionId: string,
): CollectionTree | null {
  return store.getCollectionTree(collectionId);
}
