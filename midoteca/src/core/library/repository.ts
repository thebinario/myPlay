import type { LibrarySource } from './entities';
import type { CreateLibrarySource, UpdateLibrarySourceStatus } from './inputs';

export interface LibraryRepository {
  createSource(input: CreateLibrarySource): Promise<LibrarySource>;
  findSourceById(id: string): Promise<LibrarySource | null>;
  findSourceByVolumeId(volumeId: string): Promise<LibrarySource | null>;
  listSources(): Promise<LibrarySource[]>;
  updateSourceStatus(
    id: string,
    input: UpdateLibrarySourceStatus,
  ): Promise<LibrarySource | null>;
  /**
   * Removes only the catalog row. Physical files on the volume are NEVER
   * touched here (and media rows cascade away from this source).
   */
  deleteSource(id: string): Promise<void>;
}
