import { resolveDefaultDatabasePath } from '../core/app-paths';
import {
  CourseOrganizationService,
  SqliteCourseRepository,
  type CourseRepository,
} from '../modules/courses';
import {
  DocumentAssociationService,
  SqliteDocumentRepository,
  type DocumentRepository,
} from '../modules/documents';
import { Indexer, ResourceGovernor, SqliteIndexingStore, type EventBus } from '../modules/indexing';
import { SqliteJobRepository, type JobRepository, type JobRunner } from '../modules/jobs';
import {
  LibraryQueryService,
  LibrarySourceService,
  SqliteLibraryQueryStore,
  SqliteLibraryRepository,
  type LibraryRepository,
} from '../modules/library';
import {
  DuplicatesService,
  LessonSubtitlesService,
  SqliteDuplicateReadStore,
  SqliteLessonSubtitleLookup,
  SqliteMediaAnalysisStore,
  SqliteMediaRepository,
  SqliteTranscriptCueReader,
  type AudioDecoder,
  type MediaRepository,
  type Transcriber,
} from '../modules/media';
import { AssistantService, type LlmClient } from '../modules/assistant';
import { createLocalAi, type LocalAi } from './local-ai';
import { createBackgroundJobs, type MediaTools } from './background-jobs';
import {
  ContentSearchService,
  PdfJsTextExtractor,
  RetrieveContext,
  SqliteContentIndexStore,
  SqliteEmbeddings,
  type Embedder,
} from '../modules/search';
import { NodeFileHasher } from '../platform/fs/file-hasher';
import { FsSubtitleReader } from '../platform/text/fs-subtitle-reader';
import { FfmpegFrameSampler } from '../platform/media/ffmpeg-frame-sampler';
import { FfprobeMediaProber } from '../platform/media/ffprobe-prober';
import { nowIso } from '../core/clock';
import {
  SqliteLessonMediaDurations,
  SqliteProgressRepository,
  WatchProgressService,
  type ProgressRepository,
} from '../modules/progress';
import { SqliteSettingsRepository, type SettingsRepository } from '../modules/settings';
import { TypedEventBus } from '../platform/events/typed-event-bus';
import { FsManifestLoader } from '../platform/fs/manifest-loader';
import { RecursiveFileScanner } from '../platform/fs/recursive-scanner';
import { FsSourceProbe } from '../platform/fs/source-probe';
import {
  SqliteDatabase,
  runMigrations,
  type MigrationResult,
} from '../platform/persistence/sqlite';

export interface MidotecaOptions {
  /** Database file path. Defaults to the per-user app data directory. */
  databaseFile?: string;
  /** Open the database read-only (migrations are skipped). */
  readonly?: boolean;
  /** Apply pending migrations on open. Defaults to true. */
  migrate?: boolean;
  /**
   * Media analysis adapters. Defaults to the real file hasher, ffprobe and
   * ffmpeg; tests may inject deterministic fakes.
   */
  mediaTools?: Partial<MediaTools>;
  /** Start the background job loop (desktop runtime). Defaults to false. */
  backgroundJobs?: boolean;
  /**
   * Enable local AI jobs (Whisper transcription). Defaults to false; the
   * desktop runtime turns it on. Passing `aiTools` (tests) also enables it.
   */
  localAi?: boolean;
  /** Folder for downloaded models. Defaults to `<appData>/models`. */
  aiCacheDir?: string;
  aiTools?: {
    transcriber?: Transcriber;
    audio?: AudioDecoder;
    embedder?: Embedder;
    llm?: LlmClient;
  };
}

/**
 * The application kernel: a single SQLite connection plus the domain
 * repositories wired to it. It is deliberately transport-agnostic (no NestJS,
 * Express or Tauri types), so it can be embedded behind HTTP, IPC or a worker
 * without changing the domain.
 */
export interface Midoteca {
  readonly database: SqliteDatabase;
  readonly library: LibraryRepository;
  readonly media: MediaRepository;
  readonly courses: CourseRepository;
  readonly documents: DocumentRepository;
  readonly progress: ProgressRepository;
  /** Playback coverage and completion use cases (backend decides completion). */
  readonly watchProgress: WatchProgressService;
  readonly jobs: JobRepository;
  readonly settings: SettingsRepository;
  readonly migration: MigrationResult | null;
  /** Course-organization use cases (rename/reorder/move, catalog-only). */
  readonly courseOrganization: CourseOrganizationService;
  /** Document association use cases (attach/detach, no file deletion). */
  readonly documentAssociations: DocumentAssociationService;
  /** Transport-agnostic domain event bus (IPC/WebSocket can subscribe). */
  readonly events: EventBus;
  /** Cooperative back-pressure controller for indexing. */
  readonly governor: ResourceGovernor;
  /** Manage physical storage roots (add/validate/remove). */
  readonly sources: LibrarySourceService;
  /** Incremental scanner + reconciler. */
  readonly indexer: Indexer;
  /** Paginated read-side queries. */
  readonly queries: LibraryQueryService;
  /** Persisted background job queue (media analysis, ...). */
  readonly jobRunner: JobRunner;
  /** Duplicate-content read model and explicit reuse of completions. */
  readonly duplicates: DuplicatesService;
  /** Full-text search over PDF/subtitle/transcript text (FTS5). */
  readonly contentSearch: ContentSearchService;
  /** Subtitles of a lesson for the player (files + local transcript, parsed). */
  readonly subtitles: LessonSubtitlesService;
  /** Local AI settings, status and model storage. */
  readonly ai: LocalAi;
  /** Local transcription status/settings. */
  readonly transcription: LocalAi['transcription'];
  /** Questions about the library answered locally from cited sources (RAG). */
  readonly assistant: AssistantService;
  close(): void;
}

export function createMidoteca(options: MidotecaOptions = {}): Midoteca {
  const readonly = options.readonly ?? false;
  const database = new SqliteDatabase({
    file: options.databaseFile ?? resolveDefaultDatabasePath(),
    readonly,
  });

  let migration: MigrationResult | null = null;
  if (!readonly && (options.migrate ?? true)) {
    migration = runMigrations(database);
  }

  const library = new SqliteLibraryRepository(database);
  const events = new TypedEventBus();
  const governor = new ResourceGovernor();
  const probe = new FsSourceProbe();

  const sources = new LibrarySourceService({ library, probe, events });
  const indexer = new Indexer({
    store: new SqliteIndexingStore(database),
    library,
    scanner: new RecursiveFileScanner(),
    probe,
    events,
    governor,
    manifestLoader: new FsManifestLoader(),
  });
  const queries = new LibraryQueryService(new SqliteLibraryQueryStore(database));
  const courses = new SqliteCourseRepository(database);
  const documents = new SqliteDocumentRepository(database);
  const progress = new SqliteProgressRepository(database);
  const watchProgress = new WatchProgressService({
    progress,
    durations: new SqliteLessonMediaDurations(database),
    now: nowIso,
  });
  const jobs = new SqliteJobRepository(database);
  const analysis = new SqliteMediaAnalysisStore(database);
  const content = new SqliteContentIndexStore(database);
  const settings = new SqliteSettingsRepository(database);
  const transcriptCues = new SqliteTranscriptCueReader(database);
  const subtitleReader = new FsSubtitleReader();
  const embeddings = new SqliteEmbeddings(database);
  const localAi = createLocalAi(database, settings, {
    enabled: !readonly && (options.localAi === true || options.aiTools !== undefined),
    useDefaultModels: options.localAi === true,
    cacheDir: options.aiCacheDir,
    ...options.aiTools,
  });
  const jobRunner = createBackgroundJobs({
    jobs,
    governor,
    events,
    analysis,
    content,
    text: {
      documents: new PdfJsTextExtractor(),
      subtitles: subtitleReader,
      transcripts: transcriptCues,
    },
    transcription: localAi.tools.transcription,
    embeddings: localAi.tools.embedder
      ? {
          store: embeddings,
          embedder: localAi.tools.embedder,
          isEnabled: () => localAi.ai.transcription.isEnabled(),
        }
      : undefined,
    tools: {
      hasher: options.mediaTools?.hasher ?? new NodeFileHasher(),
      prober: options.mediaTools?.prober ?? new FfprobeMediaProber(),
      sampler: options.mediaTools?.sampler ?? new FfmpegFrameSampler(),
    },
  });
  if (options.backgroundJobs && !readonly) jobRunner.start();
  const duplicates = new DuplicatesService({
    reads: new SqliteDuplicateReadStore(database),
    analysis,
    progress,
    now: nowIso,
  });

  return {
    database,
    library,
    media: new SqliteMediaRepository(database),
    courses,
    documents,
    progress,
    watchProgress,
    jobs,
    settings,
    migration,
    courseOrganization: new CourseOrganizationService({ courses }),
    documentAssociations: new DocumentAssociationService({ documents }),
    events,
    governor,
    sources,
    indexer,
    queries,
    jobRunner,
    duplicates,
    contentSearch: new ContentSearchService(content),
    subtitles: new LessonSubtitlesService({
      lookup: new SqliteLessonSubtitleLookup(database),
      files: subtitleReader,
      transcripts: transcriptCues,
    }),
    ai: localAi.ai,
    transcription: localAi.ai.transcription,
    assistant: new AssistantService({
      retriever: new RetrieveContext({
        store: content,
        vectors: embeddings,
        embedder: localAi.tools.embedder,
      }),
      llm: localAi.tools.llm,
    }),
    close: () => {
      void jobRunner.stop();
      database.close();
    },
  };
}
