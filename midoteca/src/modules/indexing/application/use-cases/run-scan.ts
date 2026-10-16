import { nowIso } from '../../../../core/clock';
import { NotFoundError } from '../../../../core/errors';
import { newId } from '../../../../core/ids';
import type { LibraryRepository } from '../../../library/domain/repositories';
import type { EventBus } from '../../domain/events';
import type { FileScanner, IndexingStore, ManifestLoader, SourceProbe } from '../../domain/ports';
import type { DiscoveredFile, IndexSummary, ScanProgress } from '../../domain/types';
import type { ResourceGovernor } from '../resource-governor';
import { ApplyOrganization } from './apply-organization';
import { ApplyTracks } from './apply-tracks';
import { ReconcileBatch } from './reconcile-batch';
import type { RunScanInput } from '../dto';

export interface RunScanDependencies {
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

/**
 * Incremental scan use case. Reconciles discovered files against the catalog
 * using a run token (`last_seen_at`), so unchanged files cost only a touch and
 * missing files are flagged without ever deleting data or touching disk. It
 * orchestrates the per-batch and organization use cases.
 */
export class RunScan {
  private readonly batchSize: number;
  private readonly progressIntervalMs: number;
  private readonly reconcile: ReconcileBatch;
  private readonly applyOrganization: ApplyOrganization;

  constructor(private readonly deps: RunScanDependencies) {
    this.batchSize = deps.batchSize ?? 200;
    this.progressIntervalMs = deps.progressIntervalMs ?? 250;
    const tracks = new ApplyTracks({ store: deps.store });
    this.reconcile = new ReconcileBatch({ store: deps.store, events: deps.events });
    this.applyOrganization = new ApplyOrganization({
      store: deps.store,
      events: deps.events,
      manifestLoader: deps.manifestLoader,
      tracks,
    });
  }

  async execute(request: RunScanInput): Promise<IndexSummary> {
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
    let scanErrors = 0;

    const emitProgress = (progress: ScanProgress) => {
      scanErrors = progress.errors;
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
          this.reconcile.execute(sourceId, batch, runToken, summary);
          batch = [];
          await governor.throttle();
        }
      }

      if (batch.length > 0) {
        this.reconcile.execute(sourceId, batch, runToken, summary);
        batch = [];
      }

      if (governor.isCancelled || request.signal?.aborted) {
        summary.status = 'cancelled';
        events.emit('index:paused', { sourceId, reason: 'cancelled' });
        await library.updateSourceStatus(sourceId, { status: 'active' });
        summary.durationMs = Date.now() - startedAt;
        return summary;
      }

      summary.errors += scanErrors;
      if (scanErrors === 0) {
        const missingIds = store.markMissing(sourceId, runToken);
        summary.missing = missingIds.length;
        for (const mediaId of missingIds) {
          events.emit('media:unavailable', { mediaId, sourceId, relativePath: '' });
        }
      }

      await this.applyOrganization.execute(sourceId, source, discovered);

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
}
