import { migration0001InitialSchema } from './0001-initial-schema';
import { migration0002Indexing } from './0002-indexing';
import { migration0003CourseOrganization } from './0003-course-organization';
import { migration0004LibraryType } from './0004-library-type';
import { migration0005Collections } from './0005-collections';
import type { Migration } from './types';

/** Ordered, append-only list. Never reorder or renumber existing entries. */
export const MIGRATIONS: readonly Migration[] = [
  migration0001InitialSchema,
  migration0002Indexing,
  migration0003CourseOrganization,
  migration0004LibraryType,
  migration0005Collections,
];
