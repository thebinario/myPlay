/**
 * Search is a Phase 2+ concern (SQLite FTS5, later embeddings/RAG). Phase 1
 * reserves the boundary and mirrors the client-facing result shape so the
 * desktop app can swap a mock implementation for a real one without contract
 * churn. No query engine is implemented here.
 */
export type SearchResultKind = 'course' | 'lesson' | 'movie' | 'document';
export type SearchFilter = 'all' | SearchResultKind;

export interface SearchQuery {
  text: string;
  filter?: SearchFilter;
  limit?: number;
}

export interface SearchHit {
  kind: SearchResultKind;
  /** Id of the root item (course/document) or the item itself (movie/lesson). */
  itemId: string;
  lessonId?: string;
  moduleId?: string;
  courseId?: string;
  title: string;
  context: string;
  available: boolean;
}

/** Read-only port; a real FTS5-backed adapter arrives in Phase 2. */
export interface SearchRepository {
  search(query: SearchQuery): Promise<SearchHit[]>;
}
