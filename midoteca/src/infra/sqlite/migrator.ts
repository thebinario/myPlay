import { nowIso } from '../../core/shared/clock';
import { PersistenceError } from '../../core/shared/errors';
import type { SqliteDatabase } from './database';
import { MIGRATIONS } from './migrations';
import type { Migration } from './migrations/types';

export interface MigrationResult {
  /** Ids of migrations applied during this run, in order. */
  applied: number[];
  /** Highest applied migration id after the run (0 = empty schema). */
  currentVersion: number;
}

interface AppliedRow {
  id: number;
  name: string;
  applied_at: string;
}

/**
 * Applies all pending migrations in order, each inside its own transaction.
 * Idempotent: already-applied migrations are skipped. The bookkeeping table is
 * created on first run; schema state is never inferred from the live tables.
 */
export function runMigrations(
  db: SqliteDatabase,
  migrations: readonly Migration[] = MIGRATIONS,
): MigrationResult {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id         INTEGER PRIMARY KEY,
      name       TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const applied = new Set<number>(
    (db.prepare('SELECT id FROM schema_migrations').all() as AppliedRow[]).map(
      (row) => row.id,
    ),
  );

  const ordered = [...migrations].sort((a, b) => a.id - b.id);
  const appliedNow: number[] = [];

  for (const migration of ordered) {
    if (applied.has(migration.id)) continue;
    db.transaction(() => {
      try {
        migration.up(db);
      } catch (error) {
        throw new PersistenceError(
          `Migration ${migration.id} (${migration.name}) failed`,
          { cause: error },
        );
      }
      db.prepare(
        'INSERT INTO schema_migrations (id, name, applied_at) VALUES (?, ?, ?)',
      ).run(migration.id, migration.name, nowIso());
    });
    appliedNow.push(migration.id);
  }

  return {
    applied: appliedNow,
    currentVersion: getCurrentVersion(db),
  };
}

export function getCurrentVersion(db: SqliteDatabase): number {
  const row = db
    .prepare('SELECT MAX(id) AS version FROM schema_migrations')
    .get() as { version: number | null } | undefined;
  return row?.version ?? 0;
}

export function listAppliedMigrations(db: SqliteDatabase): AppliedRow[] {
  return db
    .prepare('SELECT id, name, applied_at FROM schema_migrations ORDER BY id')
    .all() as AppliedRow[];
}
