import type { SqliteDatabase } from '../database';

/**
 * A versioned, forward-only schema migration. `id` is monotonic and immutable;
 * `name` must match the file name so applied migrations are traceable.
 * Migrations execute synchronously inside their own transaction.
 */
export interface Migration {
  id: number;
  name: string;
  up(db: SqliteDatabase): void;
  down(db: SqliteDatabase): void;
}
