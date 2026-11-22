import { scheduleSourceJob } from '../../jobs/application/schedule-source-job';
import type { JobRepository } from '../../jobs/domain/ports';

export const MEDIA_ANALYZE_SOURCE_JOB = 'media.analyze-source';

/** Enqueues one media-analysis job per source (deduplicated). */
export class ScheduleMediaAnalysis {
  constructor(private readonly jobs: JobRepository) {}

  execute(sourceId: string): Promise<boolean> {
    return scheduleSourceJob(this.jobs, MEDIA_ANALYZE_SOURCE_JOB, sourceId);
  }
}
