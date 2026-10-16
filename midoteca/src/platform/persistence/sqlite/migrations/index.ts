import { migration0001InitialSchema } from './0001-initial-schema';
import { migration0002Indexing } from './0002-indexing';
import type { Migration } from './types';

/** Ordered, append-only list. Never reorder or renumber existing entries. */
export const MIGRATIONS: readonly Migration[] = [migration0001InitialSchema, migration0002Indexing];
