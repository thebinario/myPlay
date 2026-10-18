import type { CollectionSummary } from '@midoteca/core';
import {
  collectionProgress,
  collectionTotalDuration,
  type Collection,
} from '@/core/domain/collection';
import type { Course, LibraryItem } from '@/core/domain/library';

/**
 * Groups the already-materialized catalog courses into collections using the
 * kernel read model (`catalog.listCollections`). Aggregates (duration, progress)
 * are derived from the courses themselves, so the projection stays pure and the
 * IPC adapter remains thin.
 *
 * Collections whose courses were filtered out (e.g. movie-only sources) are
 * dropped, keeping the UI view consistent with the catalog.
 */
export function buildCollections(
  items: readonly LibraryItem[],
  summaries: readonly CollectionSummary[],
): Collection[] {
  const courses = items.filter((item): item is Course => item.type === 'course');
  return summaries
    .map((summary) => {
      const selected = courses.filter((course) => course.collectionId === summary.id);
      const collection: Collection = {
        id: summary.id,
        sourceId: summary.sourceId,
        type: 'collection',
        title: summary.title,
        tags: [],
        createdAt: summary.updatedAt,
        courseCount: summary.courseCount,
        totalDuration: 0,
        progress: 0,
        courses: selected,
      };
      return {
        ...collection,
        totalDuration: collectionTotalDuration(collection),
        progress: collectionProgress(collection),
      };
    })
    .filter((collection) => collection.courses.length > 0);
}
