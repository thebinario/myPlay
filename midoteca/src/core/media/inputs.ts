import type { JsonObject } from '../shared/json';
import type { MediaAvailability, MediaTrackKind, MediaType } from './entities';

export interface CreateMediaFile {
  id?: string;
  sourceId: string;
  relativePath: string;
  mediaType: MediaType;
  fileSize?: number | null;
  durationMs?: number | null;
  modifiedAt?: string | null;
  sha256?: string | null;
  availability?: MediaAvailability;
  lastSeenAt?: string | null;
}

export interface UpdateMediaFile {
  id: string;
  fileSize?: number | null;
  durationMs?: number | null;
  modifiedAt?: string | null;
  sha256?: string | null;
  availability?: MediaAvailability;
  mediaType?: MediaType;
  relativePath?: string;
  lastSeenAt?: string | null;
}

export interface CreateMediaTrack {
  id?: string;
  mediaFileId: string;
  kind: MediaTrackKind;
  language?: string | null;
  path?: string | null;
  metadata?: JsonObject | null;
}
