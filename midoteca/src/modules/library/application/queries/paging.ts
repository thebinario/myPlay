import type { Page } from '../../domain/read-models';

export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 200;

/** Clamps a paging request into a safe `{ limit, offset }` window. */
export function normalizePage(query: Page): { limit: number; offset: number } {
  const limit = Math.min(Math.max(Math.trunc(query.limit ?? DEFAULT_LIMIT), 1), MAX_LIMIT);
  const offset = Math.max(Math.trunc(query.offset ?? 0), 0);
  return { limit, offset };
}
