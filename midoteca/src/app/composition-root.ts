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
import { SqliteJobRepository, type JobRepository } from '../modules/jobs';
import {
  LibraryQueryService,
  LibrarySourceService,
  SqliteLibraryQueryStore,
  SqliteLibraryRepository,
  type LibraryRepository,
} from '../modules/library';
import { SqliteMediaRepository, type MediaRepository } from '../modules/media';
import { SqliteProgressRepository, type ProgressRepository } from '../modules/progress';
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

  return {
    database,
    library,
    media: new SqliteMediaRepository(database),
    courses,
    documents,
    progress: new SqliteProgressRepository(database),
    jobs: new SqliteJobRepository(database),
    settings: new SqliteSettingsRepository(database),
    migration,
    courseOrganization: new CourseOrganizationService({ courses }),
    documentAssociations: new DocumentAssociationService({ documents }),
    events,
    governor,
    sources,
    indexer,
    queries,
    close: () => database.close(),
  };
}
