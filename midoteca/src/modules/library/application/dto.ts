import type { LibrarySourceStatus } from '../domain/entities';

/** Input of `AddSource`. */
export interface AddSourceInput {
  rootPath: string;
  displayName?: string | null;
}

/** Input of `UpdateSourcePath`. */
export interface UpdateSourcePathInput {
  sourceId: string;
  rootPath: string;
}

/** Output of `CheckSourceAvailability`. */
export interface SourceAvailability {
  sourceId: string;
  rootPath: string;
  status: LibrarySourceStatus;
  exists: boolean;
  isDirectory: boolean;
  readable: boolean;
  volumeId: string | null;
}
