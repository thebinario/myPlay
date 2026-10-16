/**
 * Timestamps are stored as ISO-8601 UTC strings (TEXT in SQLite).
 *
 * ISO strings sort lexicographically, are human readable in the DB file and are
 * unambiguous across time zones. Numeric epoch ms was rejected because SQLite
 * has no native date type to enforce anyway.
 */
export function nowIso(): string {
  return new Date().toISOString();
}

export function toIso(value: Date | string | number): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'number') return new Date(value).toISOString();
  return new Date(value).toISOString();
}
