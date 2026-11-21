import type { EventBus, ResourceGovernor } from '../modules/indexing';
import { JobRunner, type JobContext, type JobRepository } from '../modules/jobs';
import { scheduleSourceJob } from '../modules/jobs/application/schedule-source-job';
import {
  AnalyzeSourceMedia,
  MEDIA_ANALYZE_SOURCE_JOB,
  type FileHasher,
  type FrameSampler,
  type MediaAnalysisStore,
  type MediaProber,
} from '../modules/media';
import {
  ExtractSourceContent,
  SEARCH_EXTRACT_CONTENT_JOB,
  type ContentIndexStore,
  type DocumentTextExtractor,
  type SubtitleReader,
} from '../modules/search';

export interface MediaTools {
  hasher: FileHasher;
  prober?: MediaProber;
  sampler?: FrameSampler;
}

export interface TextTools {
  documents: DocumentTextExtractor;
  subtitles: SubtitleReader;
}

export interface BackgroundJobsDependencies {
  jobs: JobRepository;
  governor: ResourceGovernor;
  events: EventBus;
  analysis: MediaAnalysisStore;
  content: ContentIndexStore;
  tools: MediaTools;
  text: TextTools;
}

type SourceHandler = (sourceId: string, context: JobContext) => Promise<unknown>;

function perSource(type: string, handler: SourceHandler) {
  return async (context: JobContext) => {
    const sourceId = context.job.payload?.sourceId;
    if (typeof sourceId !== 'string') throw new Error(`${type} sem sourceId`);
    await handler(sourceId, context);
  };
}

/**
 * Wires the persisted job queue: registers handlers and, after every completed
 * scan, schedules one job per source for media analysis (probe, hashes,
 * duplicates) and for text extraction (PDFs, subtitles). The loop is started
 * only by the desktop runtime; tests drive it with `drain()`.
 */
export function createBackgroundJobs(deps: BackgroundJobsDependencies): JobRunner {
  const runner = new JobRunner({ jobs: deps.jobs, governor: deps.governor });
  const analyze = new AnalyzeSourceMedia({ store: deps.analysis, ...deps.tools });
  const extract = new ExtractSourceContent({ store: deps.content, ...deps.text });

  runner.register(
    MEDIA_ANALYZE_SOURCE_JOB,
    perSource(MEDIA_ANALYZE_SOURCE_JOB, (sourceId, context) => analyze.execute(sourceId, context)),
  );
  runner.register(
    SEARCH_EXTRACT_CONTENT_JOB,
    perSource(SEARCH_EXTRACT_CONTENT_JOB, (sourceId, context) => extract.execute(sourceId, context)),
  );

  deps.events.on('index:completed', ({ sourceId }) => {
    runner.track(scheduleSourceJob(deps.jobs, MEDIA_ANALYZE_SOURCE_JOB, sourceId));
    runner.track(scheduleSourceJob(deps.jobs, SEARCH_EXTRACT_CONTENT_JOB, sourceId, -2));
  });

  return runner;
}
