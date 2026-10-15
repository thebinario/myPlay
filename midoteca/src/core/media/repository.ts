import type { MediaAvailability, MediaFile, MediaTrack } from './entities';
import type {
  CreateMediaFile,
  CreateMediaTrack,
  UpdateMediaFile,
} from './inputs';

export interface MediaRepository {
  create(input: CreateMediaFile): Promise<MediaFile>;
  findById(id: string): Promise<MediaFile | null>;
  /** Identifies a file within a source by its relative path. */
  findBySourceAndRelativePath(
    sourceId: string,
    relativePath: string,
  ): Promise<MediaFile | null>;
  listBySource(sourceId: string): Promise<MediaFile[]>;
  /** Returns all files sharing a hash (dedup), never assuming uniqueness. */
  findBySha256(sha256: string): Promise<MediaFile[]>;
  update(input: UpdateMediaFile): Promise<MediaFile>;
  setAvailability(id: string, availability: MediaAvailability): Promise<void>;
  /** Deletes only the catalog row; the physical file is never removed. */
  delete(id: string): Promise<void>;

  addTrack(input: CreateMediaTrack): Promise<MediaTrack>;
  listTracks(mediaFileId: string): Promise<MediaTrack[]>;
  deleteTrack(id: string): Promise<void>;
}
