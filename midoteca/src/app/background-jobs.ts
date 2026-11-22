import type { EventBus, ResourceGovernor } from '../modules/indexing';
import { JobRunner, type JobContext, type JobObserver, type JobRepository } from '../modules/jobs';
import {
  scheduleJobOnce,
  scheduleSourceJob,
} from '../modules/jobs/application/schedule-source-job';
import {
  AnalyzeSourceMedia,
  CheckMediaPlayability,
  type MediaInspector,
  type PlayabilityStore,
  MEDIA_ANALYZE_SOURCE_JOB,
  TranscribeSourceMedia,
  type AudioDecoder,
  type FileHasher,
  type FrameSampler,
  type MediaAnalysisStore,
  type MediaProber,
  type Transcriber,
  type TranscriptStore,
  type TranscriptionService,
} from '../modules/media';
import {
  EmbedPendingChunks,
  ExtractSourceContent,
  SEARCH_EMBED_CHUNKS_JOB,
  SEARCH_EXTRACT_CONTENT_JOB,
  type ContentIndexStore,
  type Embedder,
  type EmbeddingStore,
  type DocumentTextExtractor,
  type SubtitleReader,
  type TranscriptCueReader,
} from '../modules/search';

export const MEDIA_TRANSCRIBE_SOURCE_JOB = 'media.transcribe-source';
/** Library-wide (not per source): cheap ffprobe pass over unchecked videos. */
export const MEDIA_CHECK_PLAYABILITY_JOB = 'media.check-playability';

export interface MediaTools {
  hasher: FileHasher;
  prober?: MediaProber;
  sampler?: FrameSampler;
  inspector?: MediaInspector;
}

export interface TextTools {
  documents: DocumentTextExtractor;
  subtitles: SubtitleReader;
  transcripts: TranscriptCueReader;
}

export interface TranscriptionTools {
  store: TranscriptStore;
  audio: AudioDecoder;
  transcriber: Transcriber;
  service: TranscriptionService;
}

export interface BackgroundJobsDependencies {
  jobs: JobRepository;
  governor: ResourceGovernor;
  events: EventBus;
  analysis: MediaAnalysisStore;
  content: ContentIndexStore;
  tools: MediaTools;
  text: TextTools;
  /** Local transcription; omitted when local AI is not available. */
  transcription?: TranscriptionTools;
  /** Where playability verdicts are stored. */
  playability: PlayabilityStore;
  /** Receives job lifecycle/progress for the activity panel. */
  observer?: JobObserver;
  /** Local embeddings for semantic search; omitted when local AI is off. */
  embeddings?: { store: EmbeddingStore; embedder: Embedder; isEnabled: () => Promise<boolean> };
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
 * Wires the persisted job queue. After every completed scan it schedules, per
 * source and in priority order: media analysis (probe, hashes, duplicates),
 * text extraction (PDFs, subtitles) and local transcription. A finished
 * transcription re-schedules text extraction so transcripts become searchable.
 * The loop is started only by the desktop runtime; tests use `drain()`.
 */
export function createBackgroundJobs(deps: BackgroundJobsDependencies): JobRunner {
  const runner = new JobRunner({
    jobs: deps.jobs,
    governor: deps.governor,
    observer: deps.observer,
  });
  const analyze = new AnalyzeSourceMedia({ store: deps.analysis, ...deps.tools });
  const extract = new ExtractSourceContent({ store: deps.content, ...deps.text });

  runner.register(
    MEDIA_ANALYZE_SOURCE_JOB,
    perSource(MEDIA_ANALYZE_SOURCE_JOB, (sourceId, context) => analyze.execute(sourceId, context)),
  );
  const embeddings = deps.embeddings;
  const scheduleEmbeddings = () =>
    embeddings
      ? scheduleJobOnce(deps.jobs, SEARCH_EMBED_CHUNKS_JOB, {}, -3)
      : Promise.resolve(false);

  runner.register(
    SEARCH_EXTRACT_CONTENT_JOB,
    perSource(SEARCH_EXTRACT_CONTENT_JOB, async (sourceId, context) => {
      await extract.execute(sourceId, context);
      await scheduleEmbeddings();
    }),
  );

  if (embeddings) {
    const embed = new EmbedPendingChunks(embeddings);
    runner.register(SEARCH_EMBED_CHUNKS_JOB, async (context) => {
      if (await embeddings.isEnabled()) await embed.execute(context);
    });
  }

  const transcription = deps.transcription;
  if (transcription) {
    const transcribe = new TranscribeSourceMedia(transcription);
    runner.register(
      MEDIA_TRANSCRIBE_SOURCE_JOB,
      perSource(MEDIA_TRANSCRIBE_SOURCE_JOB, async (sourceId, context) => {
        if (!(await transcription.service.isEnabled())) return;
        const language = await transcription.service.language();
        const finished = await transcribe.execute(sourceId, language, context);
        if (finished > 0) {
          await scheduleSourceJob(deps.jobs, SEARCH_EXTRACT_CONTENT_JOB, sourceId, -2);
        }
      }),
    );
  }

  const inspector = deps.tools.inspector;
  if (inspector) {
    const check = new CheckMediaPlayability({ store: deps.playability, inspector });
    runner.register(MEDIA_CHECK_PLAYABILITY_JOB, async (context) => {
      await check.execute(context);
    });
  }

  deps.events.on('index:completed', ({ sourceId }) => {
    if (inspector) runner.track(schedulePlayabilityCheck(deps.jobs));
    runner.track(
      scheduleSourceProcessing(deps.jobs, sourceId, { transcription: Boolean(transcription) }),
    );
  });

  return runner;
}

/**
 * Per-library processing (duplicate analysis, text extraction and, when local
 * AI exists, transcription). Deduplicated, and each job only touches what is
 * still pending, so scheduling it again is cheap.
 */
export async function scheduleSourceProcessing(
  jobs: JobRepository,
  sourceId: string,
  options: { transcription: boolean },
): Promise<void> {
  await scheduleSourceJob(jobs, MEDIA_ANALYZE_SOURCE_JOB, sourceId);
  await scheduleSourceJob(jobs, SEARCH_EXTRACT_CONTENT_JOB, sourceId, -2);
  if (options.transcription) {
    await scheduleSourceJob(jobs, MEDIA_TRANSCRIBE_SOURCE_JOB, sourceId, -5);
  }
}

/** Enqueues the playability check once (high priority: it is cheap and user-visible). */
export function schedulePlayabilityCheck(jobs: JobRepository): Promise<boolean> {
  return scheduleJobOnce(jobs, MEDIA_CHECK_PLAYABILITY_JOB, {}, 1);
}
