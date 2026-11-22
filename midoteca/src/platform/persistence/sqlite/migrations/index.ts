import { migration0001InitialSchema } from './0001-initial-schema';
import { migration0002Indexing } from './0002-indexing';
import { migration0003CourseOrganization } from './0003-course-organization';
import { migration0004LibraryType } from './0004-library-type';
import { migration0005Collections } from './0005-collections';
import { migration0006WatchCoverage } from './0006-watch-coverage';
import { migration0007MediaAnalysis } from './0007-media-analysis';
import { migration0008ContentSearch } from './0008-content-search';
import { migration0009Transcripts } from './0009-transcripts';
import { migration0010ChunkEmbeddings } from './0010-chunk-embeddings';
import { migration0011MediaPlayability } from './0011-media-playability';
import type { Migration } from './types';

/** Ordered, append-only list. Never reorder or renumber existing entries. */
export const MIGRATIONS: readonly Migration[] = [
  migration0001InitialSchema,
  migration0002Indexing,
  migration0003CourseOrganization,
  migration0004LibraryType,
  migration0005Collections,
  migration0006WatchCoverage,
  migration0007MediaAnalysis,
  migration0008ContentSearch,
  migration0009Transcripts,
  migration0010ChunkEmbeddings,
  migration0011MediaPlayability,
];
