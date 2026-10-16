import { nowIso } from '../../../../core/clock';
import { NotFoundError } from '../../../../core/errors';
import { newId } from '../../../../core/ids';
import type { LibraryRepository } from '../../../library/domain/ports';
import type { EventBus } from '../../domain/events';
import { organize, type OrganizePlan, type PlannedCourse } from '../../domain/organization';
import type { ManifestLoader, IndexingStore, SourceProbe } from '../../domain/ports';
import type { ResourceGovernor } from '../resource-governor';
import type { FileScanner } from '../../domain/ports';
import { mediaKindToType, type DiscoveredFile, type IndexSummary } from '../../domain/types';

export interface IndexerDependencies {
  store: IndexingStore;
  library: LibraryRepository;
  scanner: FileScanner;
  probe: SourceProbe;
  events: EventBus;
  governor: ResourceGovernor;
  manifestLoader?: ManifestLoader;
  /** Files reconciled per transaction. Default 200. */
  batchSize?: number;
  /** Progress emit interval, in ms. Default 250. */
  progressIntervalMs?: number;
}

export interface ScanRequest {
  sourceId: string;
  signal?: AbortSignal;
}

/**
 * Incremental indexer. Reconciles discovered files against the catalog using
 * a run token (`last_seen_at`), so unchanged files cost only a touch and
 * missing files are flagged without ever deleting data or touching disk.
 */
export class Indexer {
  private readonly batchSize: number;
  private readonly progressIntervalMs: number;

  constructor(private readonly deps: IndexerDependencies) {
    this.batchSize = deps.batchSize ?? 200;
    this.progressIntervalMs = deps.progressIntervalMs ?? 250;
  }

  async runScan(request: ScanRequest): Promise<IndexSummary> {
    const { store, library, scanner, probe, events, governor } = this.deps;
    const { sourceId } = request;
    const startedAt = Date.now();
    const summary: IndexSummary = {
      sourceId,
      status: 'completed',
      discovered: 0,
      created: 0,
      updated: 0,
      moved: 0,
      unchanged: 0,
      missing: 0,
      errors: 0,
      durationMs: 0,
    };

    const source = await library.findSourceById(sourceId);
    if (!source) throw new NotFoundError(`Library source ${sourceId} not found`);

    governor.reset();
    events.emit('index:started', { sourceId });

    const inspection = await probe.inspect(source.rootPath);
    if (!inspection.exists || !inspection.isDirectory || !inspection.readable) {
      await library.updateSourceStatus(sourceId, { status: 'offline' });
      events.emit('source:disconnected', {
        sourceId,
        rootPath: source.rootPath,
      });
      summary.status = 'source-unavailable';
      summary.durationMs = Date.now() - startedAt;
      return summary;
    }

    await library.updateSourceStatus(sourceId, { status: 'scanning' });
    events.emit('source:connected', { sourceId, rootPath: source.rootPath });

    const runToken = newId();
    const discovered: DiscoveredFile[] = [];
    let batch: DiscoveredFile[] = [];
    let lastProgress = 0;

    const emitProgress = (progress: {
      matched: number;
      visited: number;
      currentPath: string | null;
    }) => {
      const now = Date.now();
      if (now - lastProgress < this.progressIntervalMs) return;
      lastProgress = now;
      events.emit('index:progress', {
        sourceId,
        matched: progress.matched,
        visited: progress.visited,
        currentPath: progress.currentPath,
      });
    };

    try {
      for await (const file of scanner.scan(source.rootPath, {
        signal: request.signal,
        onProgress: emitProgress,
      })) {
        await governor.waitWhilePaused();
        if (governor.isCancelled || request.signal?.aborted) break;

        discovered.push(file);
        summary.discovered += 1;
        batch.push(file);

        if (batch.length >= this.batchSize) {
          this.reconcileBatch(sourceId, batch, runToken, summary, events);
          batch = [];
          await governor.throttle();
        }
      }

      if (batch.length > 0) {
        this.reconcileBatch(sourceId, batch, runToken, summary, events);
        batch = [];
      }

      if (governor.isCancelled || request.signal?.aborted) {
        summary.status = 'cancelled';
        events.emit('index:paused', { sourceId, reason: 'cancelled' });
        await library.updateSourceStatus(sourceId, { status: 'active' });
        summary.durationMs = Date.now() - startedAt;
        return summary;
      }

      const missingIds = store.markMissing(sourceId, runToken);
      summary.missing = missingIds.length;
      for (const mediaId of missingIds) {
        events.emit('media:unavailable', { mediaId, sourceId, relativePath: '' });
      }

      await this.applyOrganization(sourceId, source, discovered, events);

      await library.updateSourceStatus(sourceId, {
        status: 'active',
        lastScanAt: nowIso(),
      });
      summary.durationMs = Date.now() - startedAt;
      events.emit('index:completed', { sourceId, summary });
      return summary;
    } catch (error) {
      summary.status = 'failed';
      summary.errors += 1;
      summary.durationMs = Date.now() - startedAt;
      await library.updateSourceStatus(sourceId, { status: 'error' });
      events.emit('index:failed', {
        sourceId,
        message: error instanceof Error ? error.message : String(error),
      });
      return summary;
    }
  }

  private reconcileBatch(
    sourceId: string,
    batch: DiscoveredFile[],
    runToken: string,
    summary: IndexSummary,
    events: EventBus,
  ): void {
    const { store } = this.deps;
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

  private async applyOrganization(
    sourceId: string,
    source: { id: string; rootPath: string },
    discovered: DiscoveredFile[],
    events: EventBus,
  ): Promise<void> {
    const { store, manifestLoader } = this.deps;
    const plan = organize(discovered, {
      rootLabel: source.rootPath.split('/').pop() || source.rootPath,
    });

    const manifests = new Map<string, Awaited<ReturnType<ManifestLoader['load']>>>();
    if (manifestLoader) {
      for (const course of plan.courses) {
        const dir =
          course.relativePath === ''
            ? source.rootPath
            : joinPath(source.rootPath, course.relativePath);
        manifests.set(course.relativePath, await manifestLoader.load(dir));
      }
    }

    store.transaction(() => {
      for (const course of plan.courses) {
        const manifest = manifests.get(course.relativePath) ?? null;
        const courseResult = store.upsertCourse({
          sourceId,
          relativePath: course.relativePath,
          detectedTitle: course.title,
          manifestTitle: manifest?.course?.title ?? null,
        });
        events.emit('course:organized', {
          courseId: courseResult.id,
          sourceId,
          relativePath: course.relativePath,
          created: courseResult.created,
        });

        for (const module of course.modules) {
          const moduleResult = store.upsertModule({
            courseId: courseResult.id,
            relativePath: module.relativePath,
            detectedTitle: module.title,
            manifestTitle: manifest?.modules?.[module.relativePath]?.title ?? null,
            sortOrder: module.order,
          });

          for (const lesson of module.lessons) {
            const lessonResult = store.upsertLesson({
              moduleId: moduleResult.id,
              relativePath: lesson.relativePath,
              detectedTitle: lesson.title,
              manifestTitle: manifest?.lessons?.[lesson.relativePath]?.title ?? null,
              sortOrder: lesson.order,
            });
            for (const videoPath of lesson.videos) {
              const media = store.findMediaByPath(sourceId, videoPath);
              if (media) {
                store.linkLessonMedia(lessonResult.id, media.id, 'primary');
              }
            }
          }

          for (const document of module.documents) {
            const media = store.findMediaByPath(sourceId, document.relativePath);
            if (!media) continue;
            const docResult = store.upsertDocument({
              mediaFileId: media.id,
              detectedTitle: document.title,
            });
            store.linkDocument({
              documentId: docResult.id,
              moduleId: moduleResult.id,
            });
          }
        }

        for (const document of course.documents) {
          const media = store.findMediaByPath(sourceId, document.relativePath);
          if (!media) continue;
          const docResult = store.upsertDocument({
            mediaFileId: media.id,
            detectedTitle: document.title,
          });
          store.linkDocument({
            documentId: docResult.id,
            courseId: courseResult.id,
          });
        }
      }

      for (const document of plan.looseDocuments) {
        const media = store.findMediaByPath(sourceId, document.relativePath);
        if (!media) continue;
        store.upsertDocument({
          mediaFileId: media.id,
          detectedTitle: document.title,
        });
      }

      this.applyTracks(sourceId, plan, store);
    });
  }

  private applyTracks(sourceId: string, plan: OrganizePlan, store: IndexingStore): void {
    for (const track of plan.tracks) {
      const video = store.findMediaByPath(sourceId, track.videoRelativePath);
      if (!video) continue;
      store.addMediaTrack({
        mediaFileId: video.id,
        kind: 'subtitle',
        language: track.language,
        path: track.subtitleRelativePath,
      });
    }
  }
}

function joinPath(root: string, relative: string): string {
  const separator = root.endsWith('/') ? '' : '/';
  return `${root}${separator}${relative}`;
}

export type { PlannedCourse };
