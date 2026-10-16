import { randomUUID } from 'node:crypto';

/**
 * Generates a persistent, opaque identifier.
 *
 * UUIDv4 is used instead of file paths so that physical files can be moved,
 * renamed or remounted without invalidating catalog rows.
 */
export function newId(): string {
  return randomUUID();
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}
