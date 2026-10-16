import type { LibrarySource, LibrarySourceStatus, LibraryType } from './entities';
import type {
  CourseSummary,
  DocumentSummary,
  Page,
  Paged,
  SearchResult,
  SourceIndexState,
} from './read-models';

/** Command of `LibraryRepository.createSource`. */
export interface CreateLibrarySource {
  /** Callers may provide a UUID (seeds/tests); otherwise one is generated. */
  id?: string;
  rootPath: string;
  /** Friendly label; defaults to the basename of `rootPath` when omitted. */
  displayName?: string | null;
  libraryType?: LibraryType;
  volumeId?: string | null;
  status?: LibrarySourceStatus;
}

/** Command of `LibraryRepository.updateSourceStatus`. */
export interface UpdateLibrarySourceStatus {
  status: LibrarySourceStatus;
  /** Records the scan completion time; omit to leave untouched. */
  lastScanAt?: string | null;
}

/** Command of `LibraryRepository.updateSourcePath`. */
export interface UpdateLibrarySourcePath {
  /** New absolute root path (e.g. the drive remounted under a different path). */
  rootPath: string;
  /** Optionally update the volume id discovered at the new location. */
  volumeId?: string | null;
}

/** Command of `LibraryRepository.updateSourceName`. */
export interface UpdateLibrarySourceName {
  displayName: string;
}

/** Write-side repository of the `library` context. */
export interface LibraryRepository {
  createSource(input: CreateLibrarySource): Promise<LibrarySource>;
  findSourceById(id: string): Promise<LibrarySource | null>;
  findSourceByVolumeId(volumeId: string): Promise<LibrarySource | null>;
  findSourceByRootPath(rootPath: string): Promise<LibrarySource | null>;
  listSources(): Promise<LibrarySource[]>;
  updateSourceStatus(id: string, input: UpdateLibrarySourceStatus): Promise<LibrarySource | null>;
  updateSourcePath(id: string, input: UpdateLibrarySourcePath): Promise<LibrarySource | null>;
  updateSourceName(id: string, input: UpdateLibrarySourceName): Promise<LibrarySource | null>;
  /**
   * Removes only the catalog row. Physical files on the volume are NEVER
   * touched here (and media rows cascade away from this source).
   */
  deleteSource(id: string): Promise<void>;
}

/**
 * Read-side repository of the `library` context (projections). It lives in the
 * domain — not in `application/` — so the SQLite adapter can implement it
 * without depending on the application layer.
 */
export interface LibraryQueryStore {
  listCourses(query: Page & { sourceId?: string }): Paged<CourseSummary>;
  listDocuments(query: Page & { sourceId?: string }): Paged<DocumentSummary>;
  search(text: string, query: Page): SearchResult;
  getSourceIndexState(sourceId: string): SourceIndexState | null;
}
