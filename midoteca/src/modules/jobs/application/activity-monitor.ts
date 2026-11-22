import type { EventBus } from '../../indexing/domain/events';
import type { Job } from '../domain/entities';
import type { JobRepository } from '../domain/ports';
import {
  activityKindOf,
  describeActivity,
  progressPercent,
  recordFinished,
  shouldRecordFinished,
  sortActivities,
  ACTIVITY_HISTORY_LIMIT,
  type ActivityItem,
  type ActivityKind,
  type ActivityOutcome,
  type ActivityProgress,
  type ActivitySnapshot,
} from '../domain/activity';
import type { JobItemReport, JobObserver, JobProgressReport } from './job-runner';

/** Resolves the display name of a library source (null when unknown). */
export interface SourceNameLookup {
  nameOf(sourceId: string): Promise<string | null>;
}

/** Resolves what a processed item is called in the catalog (e.g. the lesson title). */
export interface SubjectNameLookup {
  nameOf(subjectId: string): Promise<string | null>;
}

export interface ActivityMonitorOptions {
  jobs: JobRepository;
  events: EventBus;
  sourceNames: SourceNameLookup;
  /** Names of items reported by jobs; without it the fallback name is shown. */
  subjectNames?: SubjectNameLookup;
  /** Coalesces bursts of changes into one event. Default 250 ms. */
  throttleMs?: number;
  /** Queued jobs listed in the snapshot. Default 50. */
  queueLimit?: number;
  /** Finished processes kept for the panel (in memory). Default 5. */
  historyLimit?: number;
}

interface RunningEntry {
  id: string;
  kind: ActivityKind;
  sourceId: string | null;
  progress: ActivityProgress | null;
  detail: string | null;
  startedAt: string;
  /** The job already published its items; a successful end adds nothing. */
  reportedItems?: boolean;
}

interface FinishedEntry extends RunningEntry {
  status: 'completed' | 'failed';
  finishedAt: string;
  /** Set for item entries: named after the item instead of the library. */
  subject?: { id: string | null; fallbackName: string };
}

function sourceIdOf(job: Job): string | null {
  const value = job.payload?.sourceId;
  return typeof value === 'string' ? value : null;
}

/**
 * Keeps the live picture of background work: running jobs (via the runner's
 * observer hooks), library scans (via indexing events) and the persisted queue.
 * Publishes `activity:changed` with a ready-to-render snapshot.
 */
export class ActivityMonitor implements JobObserver {
  private readonly running = new Map<string, RunningEntry>();
  /** Newest first; resolved into items (with names) at snapshot time. */
  private history: FinishedEntry[] = [];
  private readonly names = new Map<string, string | null>();
  private readonly subjectNames = new Map<string, string | null>();
  private sequence = 0;
  private readonly detach: Array<() => void> = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;

  constructor(private readonly options: ActivityMonitorOptions) {
    const { events } = options;
    this.detach.push(
      events.on('index:started', ({ sourceId }) => {
        this.running.set(this.scanId(sourceId), {
          id: this.scanId(sourceId),
          kind: 'scan',
          sourceId,
          progress: null,
          detail: null,
          startedAt: new Date().toISOString(),
        });
        this.changed();
      }),
      events.on('index:progress', ({ sourceId, matched, currentPath }) => {
        const entry = this.running.get(this.scanId(sourceId));
        if (!entry) return;
        entry.progress = { done: matched, total: null };
        entry.detail = currentPath;
        this.changed();
      }),
      events.on('index:completed', ({ sourceId }) => this.finishScan(sourceId, 'completed')),
      events.on('index:failed', ({ sourceId, message }) =>
        this.finishScan(sourceId, 'failed', message),
      ),
      events.on('index:paused', ({ sourceId }) => this.finishScan(sourceId, 'requeued')),
      events.on('source:added', ({ sourceId }) => this.names.delete(sourceId)),
    );
  }

  jobStarted(job: Job): void {
    this.running.set(job.id, {
      id: job.id,
      kind: activityKindOf(job.type),
      sourceId: sourceIdOf(job),
      progress: null,
      detail: null,
      startedAt: new Date().toISOString(),
    });
    this.changed();
  }

  jobProgress(job: Job, report: JobProgressReport): void {
    const entry = this.running.get(job.id);
    if (!entry) return;
    entry.progress = { done: report.done, total: report.total ?? null };
    entry.detail = report.detail ?? null;
    this.changed();
  }

  jobItem(job: Job, item: JobItemReport): void {
    const entry = this.running.get(job.id);
    if (entry) entry.reportedItems = true;
    this.record({
      id: `${job.id}:${item.subjectId ?? item.fallbackName}`,
      kind: entry?.kind ?? activityKindOf(job.type),
      sourceId: entry?.sourceId ?? sourceIdOf(job),
      progress: null,
      detail: item.outcome === 'failed' ? (item.error ?? null) : null,
      startedAt: entry?.startedAt ?? new Date().toISOString(),
      status: item.outcome,
      finishedAt: new Date().toISOString(),
      subject: { id: item.subjectId, fallbackName: item.fallbackName },
    });
    this.changed();
  }

  jobFinished(job: Job, outcome: ActivityOutcome, error?: string): void {
    this.finish(job.id, outcome, error);
  }

  async snapshot(): Promise<ActivitySnapshot> {
    const pending = await this.options.jobs.listByStatus('pending', this.options.queueLimit ?? 50);
    const running = await Promise.all(
      [...this.running.values()].map((entry) => this.toItem(entry, 'running')),
    );
    const queued = await Promise.all(
      pending.map((job) =>
        this.toItem(
          {
            id: job.id,
            kind: activityKindOf(job.type),
            sourceId: sourceIdOf(job),
            progress: null,
            detail: null,
            startedAt: job.createdAt,
          },
          'queued',
        ),
      ),
    );
    const recent = await Promise.all(
      this.history.map(async (entry) => ({
        ...(await this.toItem(entry, entry.status)),
        finishedAt: entry.finishedAt,
      })),
    );
    return {
      items: sortActivities([...running, ...queued]),
      running: running.length,
      queued: queued.length,
      recent,
    };
  }

  dispose(): void {
    this.disposed = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    for (const off of this.detach.splice(0)) off();
  }

  private finishScan(sourceId: string, outcome: ActivityOutcome, error?: string): void {
    this.finish(this.scanId(sourceId), outcome, error);
  }

  /**
   * Leaves the running list; completed/failed work enters the history. A job
   * that published its items is represented by them, unless the job failed.
   */
  private finish(id: string, outcome: ActivityOutcome, error?: string): void {
    const entry = this.running.get(id);
    if (!entry) return;
    this.running.delete(id);
    const representedByItems = entry.reportedItems && outcome === 'completed';
    if (outcome !== 'requeued' && !representedByItems && shouldRecordFinished(entry.progress)) {
      this.record({
        ...entry,
        detail: outcome === 'failed' ? (error ?? null) : null,
        status: outcome,
        finishedAt: new Date().toISOString(),
      });
    }
    this.changed();
  }

  private record(entry: FinishedEntry): void {
    this.sequence += 1;
    this.history = recordFinished(
      this.history,
      // History ids must not collide with a later run of the same work.
      { ...entry, id: `${entry.id}@${this.sequence}` },
      this.options.historyLimit ?? ACTIVITY_HISTORY_LIMIT,
    );
  }

  private scanId(sourceId: string): string {
    return `scan:${sourceId}`;
  }

  private async toItem(
    entry: RunningEntry | FinishedEntry,
    status: ActivityItem['status'],
  ): Promise<ActivityItem> {
    const subject = 'subject' in entry ? entry.subject : undefined;
    const name = subject
      ? ((await this.subjectNameOf(subject.id)) ?? subject.fallbackName)
      : entry.sourceId
        ? await this.nameOf(entry.sourceId)
        : null;
    return {
      id: entry.id,
      kind: entry.kind,
      status,
      label: describeActivity(entry.kind, name),
      sourceId: entry.sourceId,
      progress: entry.progress ? { ...entry.progress } : null,
      percent: progressPercent(entry.progress),
      detail: entry.detail,
      startedAt: entry.startedAt,
      finishedAt: null,
    };
  }

  private async nameOf(sourceId: string): Promise<string | null> {
    if (!this.names.has(sourceId)) {
      const name = await this.options.sourceNames.nameOf(sourceId).catch(() => null);
      this.names.set(sourceId, name);
    }
    return this.names.get(sourceId) ?? null;
  }

  private async subjectNameOf(subjectId: string | null): Promise<string | null> {
    const lookup = this.options.subjectNames;
    if (!subjectId || !lookup) return null;
    if (!this.subjectNames.has(subjectId)) {
      this.subjectNames.set(subjectId, await lookup.nameOf(subjectId).catch(() => null));
    }
    return this.subjectNames.get(subjectId) ?? null;
  }

  /** Trailing throttle: one `activity:changed` per window with the latest state. */
  private changed(): void {
    if (this.disposed || this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.disposed) return;
      this.snapshot()
        .then((snapshot) => {
          if (!this.disposed) this.options.events.emit('activity:changed', snapshot);
        })
        .catch(() => undefined);
    }, this.options.throttleMs ?? 250);
  }
}
