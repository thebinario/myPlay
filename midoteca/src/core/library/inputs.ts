import type { LibrarySourceStatus } from './entities';

export interface CreateLibrarySource {
  /** Callers may provide a UUID (seeds/tests); otherwise one is generated. */
  id?: string;
  rootPath: string;
  volumeId?: string | null;
  status?: LibrarySourceStatus;
}

export interface UpdateLibrarySourceStatus {
  status: LibrarySourceStatus;
  /** Records the scan completion time; omit to leave untouched. */
  lastScanAt?: string | null;
}
