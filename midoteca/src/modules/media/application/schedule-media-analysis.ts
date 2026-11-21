import type { JobRepository } from '../../jobs/domain/ports';

export const MEDIA_ANALYZE_SOURCE_JOB = 'media.analyze-source';

/**
 * Enqueues one analysis job per source (not one per file). Skips when a job
 * for the same source is already pending or running.
 */
export class ScheduleMediaAnalysis {
  constructor(private readonly jobs: JobRepository) {}

  async execute(sourceId: string): Promise<boolean> {
    const active = [
      ...(await this.jobs.listByStatus('pending')),
      ...(await this.jobs.listByStatus('running')),
    ];
    const alreadyQueued = active.some(
      (job) => job.type === MEDIA_ANALYZE_SOURCE_JOB && job.payload?.sourceId === sourceId,
    );
    if (alreadyQueued) return false;
    await this.jobs.enqueue({
      type: MEDIA_ANALYZE_SOURCE_JOB,
      payload: { sourceId },
      priority: -1,
    });
    return true;
  }
}
