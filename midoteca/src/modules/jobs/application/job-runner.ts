import type { JsonObject } from '../../../core/json';
import type { Job } from '../domain/entities';
import type { JobRepository } from '../domain/ports';

/** Cooperative back-pressure, satisfied by the indexing `ResourceGovernor`. */
export interface JobPacer {
  waitWhilePaused(): Promise<void>;
  throttle(): Promise<void>;
  /** Waits until no media is playing (heavy work). Defaults to the pause wait. */
  waitWhilePlaybackActive?(): Promise<void>;
}

/** Progress a handler reports between units of work. */
export interface JobProgressReport {
  done: number;
  /** Null/omitted when the amount of work is unknown. */
  total?: number | null;
  /** What is being processed now (e.g. a relative file path). */
  detail?: string | null;
}

/** Lifecycle hooks for whoever shows background work (activity monitor). */
export interface JobObserver {
  jobStarted(job: Job): void;
  jobProgress(job: Job, progress: JobProgressReport): void;
  /** `requeued` = it will run again (retry or interruption), not a final outcome. */
  jobFinished(job: Job, outcome: 'completed' | 'failed' | 'requeued'): void;
}

export interface JobContext {
  job: Job;
  /** Publishes progress for the activity panel (not persisted). */
  reportProgress(progress: JobProgressReport): void;
  /** Persists progress so a retry/restart resumes from here. */
  saveCheckpoint(checkpoint: JsonObject): Promise<void>;
  /** Call between units of work: honours pause and playback back-off. */
  yieldToPlayback(): Promise<void>;
  /** For heavy work: waits until playback stops (and honours pause). */
  waitForIdle(): Promise<void>;
  /** Aborted when the runner stops. */
  signal: AbortSignal;
}

export type JobHandler = (context: JobContext) => Promise<void>;

export interface JobRunnerOptions {
  jobs: JobRepository;
  governor: JobPacer;
  /** Attempts before a job is marked failed. Default 3. */
  maxAttempts?: number;
  /** Idle polling interval for the background loop, in ms. Default 2000. */
  pollIntervalMs?: number;
  /** Optional lifecycle observer (activity panel). */
  observer?: JobObserver;
}

/**
 * Executes the persisted job queue one job at a time (background work must
 * never compete with playback). Jobs survive restarts: `running` jobs left by a
 * crash are re-queued, checkpoints are persisted, failures are retried up to
 * `maxAttempts`.
 */
export class JobRunner {
  private readonly handlers = new Map<string, JobHandler>();
  private readonly maxAttempts: number;
  private readonly pollIntervalMs: number;
  private controller = new AbortController();
  private loop: Promise<void> | null = null;
  private wake: (() => void) | null = null;
  private current: Promise<boolean> | null = null;
  private readonly enqueueing = new Set<Promise<unknown>>();

  constructor(private readonly options: JobRunnerOptions) {
    this.maxAttempts = options.maxAttempts ?? 3;
    this.pollIntervalMs = options.pollIntervalMs ?? 2_000;
  }

  register(type: string, handler: JobHandler): void {
    this.handlers.set(type, handler);
  }

  /** Re-queues jobs that were `running` when the previous session ended. */
  async recoverInterrupted(): Promise<void> {
    for (const job of await this.options.jobs.listByStatus('running', 1_000)) {
      await this.options.jobs.update(job.id, { status: 'pending' });
    }
  }

  /** Processes the highest-priority pending job. Returns false when idle. */
  runOnce(): Promise<boolean> {
    const run = (this.current ?? Promise.resolve(true)).then(() => this.processNext());
    this.current = run.catch(() => false);
    return run;
  }

  /** Registers an in-flight enqueue so `drain` waits for it, then wakes the loop. */
  track(enqueue: Promise<unknown>): void {
    const tracked = enqueue.catch((error: unknown) => {
      console.error('[jobs] falha ao enfileirar job', error);
    });
    this.enqueueing.add(tracked);
    void tracked.finally(() => {
      this.enqueueing.delete(tracked);
      this.notify();
    });
  }

  /** Runs until the queue is empty (tests, explicit flushes). */
  async drain(): Promise<void> {
    await Promise.all([...this.enqueueing]);
    while (await this.runOnce()) {
      /* keep going */
    }
  }

  /** Starts the background loop (desktop runtime). */
  start(): void {
    if (this.loop) return;
    this.controller = new AbortController();
    const signal = this.controller.signal;
    this.loop = (async () => {
      await this.recoverInterrupted();
      while (!signal.aborted) {
        const worked = await this.runOnce().catch(() => false);
        if (!worked && !signal.aborted) {
          await new Promise<void>((resolve) => {
            const timer = setTimeout(resolve, this.pollIntervalMs);
            this.wake = () => {
              clearTimeout(timer);
              resolve();
            };
          });
          this.wake = null;
        }
      }
    })();
  }

  /** Wakes the idle loop right away (e.g. after enqueueing). */
  notify(): void {
    this.wake?.();
  }

  async stop(): Promise<void> {
    this.controller.abort();
    this.notify();
    await this.loop;
    await this.current;
    this.loop = null;
  }

  private async processNext(): Promise<boolean> {
    await this.options.governor.waitWhilePaused();
    const [job] = await this.options.jobs.listByStatus('pending', 1);
    if (!job) return false;

    const handler = this.handlers.get(job.type);
    if (!handler) {
      await this.options.jobs.update(job.id, { status: 'failed', incrementAttempts: true });
      return true;
    }

    await this.options.jobs.update(job.id, { status: 'running', incrementAttempts: true });
    const running = { ...job, status: 'running' as const, attempts: job.attempts + 1 };
    const { observer } = this.options;
    observer?.jobStarted(running);
    let checkpoint = job.checkpoint;
    let outcome: 'completed' | 'failed' | 'requeued' = 'requeued';
    try {
      await handler({
        job: running,
        signal: this.controller.signal,
        reportProgress: (progress) => observer?.jobProgress(running, progress),
        saveCheckpoint: async (next) => {
          checkpoint = next;
          await this.options.jobs.update(job.id, { checkpoint: next });
        },
        yieldToPlayback: async () => {
          await this.options.governor.waitWhilePaused();
          await this.options.governor.throttle();
        },
        waitForIdle: async () => {
          const { governor } = this.options;
          await (governor.waitWhilePlaybackActive?.() ?? governor.waitWhilePaused());
        },
      });
      await this.options.jobs.update(job.id, { status: 'completed', checkpoint });
      outcome = 'completed';
    } catch (error) {
      const attempts = job.attempts + 1;
      const status = attempts >= this.maxAttempts ? 'failed' : 'pending';
      await this.options.jobs.update(job.id, { status, checkpoint });
      outcome = status === 'failed' ? 'failed' : 'requeued';
      if (status === 'failed') {
        console.error(`[jobs] ${job.type} falhou após ${attempts} tentativas`, error);
      }
    } finally {
      observer?.jobFinished(running, outcome);
    }
    return true;
  }
}
