import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { PersistenceError } from '../../../core/errors';

export interface SqliteDatabaseOptions {
  /** Absolute path to the database file, or `:memory:` for ephemeral/test DBs. */
  file: string;
  /** Open read-only (no migrations will be applied). */
  readonly?: boolean;
  /** How long to wait on a locked database before failing (ms). */
  busyTimeoutMs?: number;
}

/**
 * Thin, explicit wrapper over a single better-sqlite3 connection.
 *
 * It centralizes the connection-level invariants the domain relies on:
 * WAL journaling, enforced foreign keys, a busy timeout and manual transactions.
 * No schema synchronization happens implicitly here; migrations are explicit.
 */
export class SqliteDatabase {
  private readonly connection: Database.Database;
  private closed = false;

  constructor(options: SqliteDatabaseOptions) {
    const file = options.file;
    if (file !== ':memory:') {
      mkdirSync(dirname(file), { recursive: true });
    }

    try {
      this.connection = new Database(file, {
        readonly: options.readonly ?? false,
        fileMustExist: false,
      });
    } catch (error) {
      throw new PersistenceError(`Failed to open SQLite database at ${file}`, {
        cause: error,
      });
    }

    // Connection-level pragmas. `foreign_keys` is per-connection and must be
    // enabled every time; it is never persisted in the database file.
    this.connection.pragma('foreign_keys = ON');
    // WAL gives concurrent readers + a single writer without blocking reads.
    // For `:memory:` this is a harmless no-op (reports "memory").
    this.connection.pragma('journal_mode = WAL');
    this.connection.pragma('synchronous = NORMAL');
    this.connection.pragma(`busy_timeout = ${options.busyTimeoutMs ?? 5000}`);
  }

  /** Underlying handle, for infrastructure-only usage. */
  get raw(): Database.Database {
    this.assertOpen();
    return this.connection;
  }

  exec(sql: string): void {
    this.assertOpen();
    this.connection.exec(sql);
  }

  prepare(sql: string): Database.Statement {
    this.assertOpen();
    return this.connection.prepare(sql);
  }

  /**
   * Runs `fn` inside an explicit transaction, committing on success and rolling
   * back on any thrown error. Nested calls are not supported by design.
   */
  transaction<T>(fn: () => T): T {
    this.assertOpen();
    return this.connection.transaction(fn)();
  }

  close(): void {
    if (this.closed) return;
    this.connection.close();
    this.closed = true;
  }

  get isOpen(): boolean {
    return !this.closed;
  }

  private assertOpen(): void {
    if (this.closed) {
      throw new PersistenceError('Database connection is already closed');
    }
  }
}
