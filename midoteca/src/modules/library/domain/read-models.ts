import type { TitleSource } from '../../../core/title-source';
import type { LibrarySourceStatus } from './entities';

/** Paging request shared by every read-side query. */
export interface Page {
  limit?: number;
  offset?: number;
}

export interface Paged<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface CourseSummary {
  id: string;
  title: string;
  sourceId: string | null;
  relativePath: string | null;
  titleSource: TitleSource;
  moduleCount: number;
  lessonCount: number;
  updatedAt: string;
}

export interface DocumentSummary {
  id: string;
  title: string;
  mediaFileId: string;
  titleSource: TitleSource;
  pageCount: number | null;
}

export interface SearchResult {
  courses: CourseSummary[];
  documents: DocumentSummary[];
}

export type CatalogSearchKind = 'course' | 'lesson' | 'movie' | 'document';
export type CatalogSearchFilter = 'all' | CatalogSearchKind;

/** Search hit prepared by the core, including its local path for navigation. */
export interface CatalogSearchHit {
  kind: CatalogSearchKind;
  itemId: string;
  lessonId?: string;
  moduleId?: string;
  courseId?: string;
  title: string;
  context: string;
  available: boolean;
  sourceId: string | null;
  relativePath: string | null;
  filePath: string | null;
}

export interface SourceIndexState {
  sourceId: string;
  status: LibrarySourceStatus;
  lastScanAt: string | null;
  mediaCount: number;
  courseCount: number;
}

/** Lightweight collection row for the collections grid. */
export interface CollectionSummary {
  id: string;
  title: string;
  sourceId: string;
  relativePath: string;
  titleSource: TitleSource;
  courseCount: number;
  /** Aggregated video duration across the collection's courses (seconds). */
  totalDurationSeconds: number;
  /** Completion percentage (0–100) across lessons and linked documents. */
  progress: number;
  updatedAt: string;
}

export interface CollectionModuleNode {
  id: string;
  title: string;
  lessonCount: number;
  documentCount: number;
}

export interface CollectionSectionNode {
  id: string;
  title: string;
  modules: CollectionModuleNode[];
  documentCount: number;
}

export interface CollectionCourseNode {
  id: string;
  title: string;
  relativePath: string | null;
  category: string | null;
  provider: string | null;
  sections: CollectionSectionNode[];
  lessonCount: number;
  documentCount: number;
}

/** Collection → courses → sections → modules tree consumed by the frontend. */
export interface CollectionTree {
  id: string;
  title: string;
  sourceId: string;
  courses: CollectionCourseNode[];
}
