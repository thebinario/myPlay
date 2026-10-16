import { mediaKindToType, type DiscoveredFile, type IndexSummary } from '../../domain/types';
import type { EventBus } from '../../domain/events';
import type { IndexingStore } from '../../domain/ports';

export interface ReconcileBatchDependencies {
  store: IndexingStore;
  events: EventBus;
}

/**
 * Reconciles one batch of discovered files against the catalog inside a single
 * transaction: touches unchanged/moved rows and inserts new media. Events are
 * collected during the transaction and only emitted after it commits.
 */
export class ReconcileBatch {
  constructor(private readonly deps: ReconcileBatchDependencies) {}

  execute(
    sourceId: string,
    batch: DiscoveredFile[],
    runToken: string,
    summary: IndexSummary,
  ): void {
    const { store, events } = this.deps;
    const discoveredEvents: Array<{ mediaId: string; relativePath: string }> = [];
    const updatedEvents: Array<{
      mediaId: string;
      relativePath: string;
      reason: 'modified' | 'moved';
    }> = [];

    store.transaction(() => {
      for (const file of batch) {
        const existing = store.findMediaByPath(sourceId, file.relativePath);
        if (existing) {
          const changed =
            existing.fileSize !== file.size || existing.modifiedAt !== file.modifiedAt;
          store.touchMedia(existing.id, {
            relativePath: file.relativePath,
            fileSize: file.size,
            modifiedAt: file.modifiedAt,
            runToken,
          });
          if (changed) {
            summary.updated += 1;
            updatedEvents.push({
              mediaId: existing.id,
              relativePath: file.relativePath,
              reason: 'modified',
            });
          } else {
            summary.unchanged += 1;
          }
          continue;
        }

        const candidate = store.findMoveCandidate(sourceId, file.size, file.modifiedAt, runToken);
        if (candidate) {
          store.touchMedia(candidate.id, {
            relativePath: file.relativePath,
            fileSize: file.size,
            modifiedAt: file.modifiedAt,
            runToken,
          });
          summary.moved += 1;
          updatedEvents.push({
            mediaId: candidate.id,
            relativePath: file.relativePath,
            reason: 'moved',
          });
          continue;
        }

        const id = store.insertMedia({
          sourceId,
          relativePath: file.relativePath,
          mediaType: mediaKindToType(file.kind),
          fileSize: file.size,
          modifiedAt: file.modifiedAt,
          runToken,
        });
        summary.created += 1;
        discoveredEvents.push({ mediaId: id, relativePath: file.relativePath });
      }
    });

    for (const event of discoveredEvents) {
      events.emit('media:discovered', { sourceId, ...event });
    }
    for (const event of updatedEvents) {
      events.emit('media:updated', { sourceId, ...event });
    }
  }
}
