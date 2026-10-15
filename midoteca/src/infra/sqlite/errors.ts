import { ConflictError, PersistenceError, type MidotecaError } from '../../core/shared/errors';

interface SqliteErrorLike {
  code?: string;
  message?: string;
}

/**
 * Translates driver-specific SQLite failures into the domain error hierarchy so
 * that callers never depend on `better-sqlite3` error shapes.
 */
export function mapSqliteError(error: unknown, context: string): MidotecaError {
  const { code, message } = (error ?? {}) as SqliteErrorLike;
  if (typeof code === 'string' && code.startsWith('SQLITE_CONSTRAINT')) {
    return new ConflictError(`${context}: constraint violated (${code})`, {
      cause: error,
    });
  }
  return new PersistenceError(`${context}: ${message ?? String(error)}`, {
    cause: error,
  });
}
