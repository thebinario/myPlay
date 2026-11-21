import type { EventBus, ResourceGovernor } from '../modules/indexing';
import { JobRunner, type JobRepository } from '../modules/jobs';
import {
  AnalyzeSourceMedia,
  MEDIA_ANALYZE_SOURCE_JOB,
  ScheduleMediaAnalysis,
  type FileHasher,
  type FrameSampler,
  type MediaAnalysisStore,
  type MediaProber,
} from '../modules/media';

export interface MediaTools {
  hasher: FileHasher;
  prober?: MediaProber;
  sampler?: FrameSampler;
}

export interface BackgroundJobsDependencies {
  jobs: JobRepository;
  governor: ResourceGovernor;
  events: EventBus;
  analysis: MediaAnalysisStore;
  tools: MediaTools;
}

/**
 * Wires the persisted job queue: registers handlers and schedules media
 * analysis after every completed scan. The runner loop is started only by the
 * desktop runtime (`startBackgroundJobs`); tests drive it with `drain()`.
 */
export function createBackgroundJobs(deps: BackgroundJobsDependencies): JobRunner {
  const runner = new JobRunner({ jobs: deps.jobs, governor: deps.governor });
  const analyze = new AnalyzeSourceMedia({ store: deps.analysis, ...deps.tools });
  const schedule = new ScheduleMediaAnalysis(deps.jobs);

  runner.register(MEDIA_ANALYZE_SOURCE_JOB, async ({ job, yieldToPlayback, signal }) => {
    const sourceId = job.payload?.sourceId;
    if (typeof sourceId !== 'string') throw new Error('media.analyze-source sem sourceId');
    await analyze.execute(sourceId, { yieldToPlayback, signal });
  });

  deps.events.on('index:completed', ({ sourceId }) => {
    runner.track(schedule.execute(sourceId));
  });

  return runner;
}
