import { resolveDefaultDatabasePath } from './core/shared/app-paths';
import type { CourseRepository } from './core/courses/repository';
import type { DocumentRepository } from './core/documents/repository';
import type { JobRepository } from './core/jobs/repository';
import type { LibraryRepository } from './core/library/repository';
import type { MediaRepository } from './core/media/repository';
import type { ProgressRepository } from './core/progress/repository';
import type { SettingsRepository } from './core/settings/repository';
import { SqliteDatabase } from './infra/sqlite/database';
import { runMigrations, type MigrationResult } from './infra/sqlite/migrator';
import { SqliteCourseRepository } from './infra/sqlite/repositories/course.repository.sqlite';
import { SqliteDocumentRepository } from './infra/sqlite/repositories/document.repository.sqlite';
import { SqliteJobRepository } from './infra/sqlite/repositories/job.repository.sqlite';
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

  return {
    database,
    library: new SqliteLibraryRepository(database),
    media: new SqliteMediaRepository(database),
    courses: new SqliteCourseRepository(database),
    documents: new SqliteDocumentRepository(database),
    progress: new SqliteProgressRepository(database),
    jobs: new SqliteJobRepository(database),
    settings: new SqliteSettingsRepository(database),
    migration,
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
