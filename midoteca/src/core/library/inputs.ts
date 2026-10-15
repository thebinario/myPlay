import type { LibrarySourceStatus } from './entities';

export interface CreateLibrarySource {
  /** Callers may provide a UUID (seeds/tests); otherwise one is generated. */
  id?: string;
  rootPath: string;
  /** Friendly label; defaults to the basename of `rootPath` when omitted. */
  displayName?: string | null;
  volumeId?: string | null;
  status?: LibrarySourceStatus;
}

export interface UpdateLibrarySourceStatus {
  status: LibrarySourceStatus;
  /** Records the scan completion time; omit to leave untouched. */
  lastScanAt?: string | null;
}

export interface UpdateLibrarySourcePath {
  /** New absolute root path (e.g. the drive remounted under a different path). */
  rootPath: string;
  /** Optionally update the volume id discovered at the new location. */
  volumeId?: string | null;
}
