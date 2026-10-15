import { resolveDefaultDatabasePath } from './core/shared/app-paths';
import type { CourseRepository } from './core/courses/repository';
import type { DocumentRepository } from './core/documents/repository';
import type { EventBus } from './core/indexing/events';
import { Indexer } from './core/indexing/indexer';
import { ResourceGovernor } from './core/indexing/resource-governor';
import type { JobRepository } from './core/jobs/repository';
import { LibraryQueryService } from './core/library/queries';
import type { LibraryRepository } from './core/library/repository';
import { LibrarySourceService } from './core/library/service';
import type { MediaRepository } from './core/media/repository';
import type { ProgressRepository } from './core/progress/repository';
import type { SettingsRepository } from './core/settings/repository';
import { TypedEventBus } from './infra/events/typed-event-bus';
import { FsManifestLoader } from './infra/fs/manifest-loader';
import { RecursiveFileScanner } from './infra/fs/recursive-scanner';
import { FsSourceProbe } from './infra/fs/source-probe';
import { SqliteDatabase } from './infra/sqlite/database';
import { runMigrations, type MigrationResult } from './infra/sqlite/migrator';
import { SqliteCourseRepository } from './infra/sqlite/repositories/course.repository.sqlite';
import { SqliteDocumentRepository } from './infra/sqlite/repositories/document.repository.sqlite';
import { SqliteIndexingStore } from './infra/sqlite/repositories/indexing.store.sqlite';
import { SqliteJobRepository } from './infra/sqlite/repositories/job.repository.sqlite';
import { SqliteLibraryQueryStore } from './infra/sqlite/repositories/library-query.repository.sqlite';
import { SqliteLibraryRepository } from './infra/sqlite/repositories/library.repository.sqlite';
import { SqliteMediaRepository } from './infra/sqlite/repositories/media.repository.sqlite';
import { SqliteProgressRepository } from './infra/sqlite/repositories/progress.repository.sqlite';
import { SqliteSettingsRepository } from './infra/sqlite/repositories/settings.repository.sqlite';

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

  return {
    database,
    library,
    media: new SqliteMediaRepository(database),
    courses: new SqliteCourseRepository(database),
    documents: new SqliteDocumentRepository(database),
    progress: new SqliteProgressRepository(database),
    jobs: new SqliteJobRepository(database),
    settings: new SqliteSettingsRepository(database),
    migration,
    events,
    governor,
    sources,
    indexer,
    queries,
    close: () => database.close(),
  };
}

export * from './core/shared';
export * from './core/library';
export * from './core/media';
export * from './core/courses';
export * from './core/documents';
export * from './core/progress';
export * from './core/jobs';
export * from './core/settings';
export * from './core/indexing';
export * from './core/search';
export { SqliteDatabase } from './infra/sqlite/database';
export { runMigrations, getCurrentVersion, listAppliedMigrations } from './infra/sqlite/migrator';
export type { Migration } from './infra/sqlite/migrations/types';
