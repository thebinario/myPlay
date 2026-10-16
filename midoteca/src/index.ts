/**
 * Public API of `@midoteca/core`.
 *
 * The composition root lives in `app/composition-root.ts`; this module only
 * publishes the surface consumers are allowed to depend on: the kernel
 * (`core/`), the bounded contexts (`modules/`) and the persistence entry
 * points of `platform/`.
 */
export * from './core';
export * from './modules/library';
export * from './modules/media';
export * from './modules/courses';
export * from './modules/documents';
export * from './modules/progress';
export * from './modules/jobs';
export * from './modules/settings';
export * from './modules/indexing';
export * from './modules/search';
export { createMidoteca } from './app/composition-root';
export type { Midoteca, MidotecaOptions } from './app/composition-root';
export { SqliteDatabase } from './platform/persistence/sqlite/database';
export {
  runMigrations,
  getCurrentVersion,
  listAppliedMigrations,
} from './platform/persistence/sqlite/migrator';
export type { Migration } from './platform/persistence/sqlite/migrations/types';
