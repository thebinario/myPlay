import { nowIso } from '../../../core/shared/clock';
import { NotFoundError, ValidationError } from '../../../core/shared/errors';
import { decodeObject, encodeJson } from '../../../core/shared/json-codec';
import {
  assertNonEmptyString,
  assertOneOf,
  assertOptionalNonNegativeNumber,
  normalizeOptionalString,
  resolveId,
} from '../../../core/shared/validation';
import {
  MEDIA_AVAILABILITIES,
  MEDIA_TRACK_KINDS,
  MEDIA_TYPES,
  type MediaAvailability,
  type MediaFile,
  type MediaTrack,
  type MediaTrackKind,
  type MediaType,
} from '../../../core/media/entities';
import type {
  CreateMediaFile,
  CreateMediaTrack,
  UpdateMediaFile,
} from '../../../core/media/inputs';
import type { MediaRepository } from '../../../core/media/repository';
import type { SqliteDatabase } from '../database';
import { mapSqliteError } from '../errors';

const SHA256_RE = /^[0-9a-f]{64}$/i;

function normalizeSha256(value: unknown): string | null {
  const normalized = normalizeOptionalString(value, 'sha256');
  if (normalized === null) return null;
  if (!SHA256_RE.test(normalized)) {
    throw new ValidationError('Field "sha256" must be a 64-character hex digest');
  }
  return normalized.toLowerCase();
}

function normalizeIso(value: unknown, field: string): string | null {
  const normalized = normalizeOptionalString(value, field);
  if (normalized === null) return null;
  if (Number.isNaN(Date.parse(normalized))) {
    throw new ValidationError(`Field "${field}" must be an ISO-8601 date string`);
  }
  return new Date(normalized).toISOString();
}

interface MediaRow {
  id: string;
  source_id: string;
  relative_path: string;
  media_type: string;
  file_size: number | null;
  duration_ms: number | null;
  modified_at: string | null;
  sha256: string | null;
  availability: string;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

interface TrackRow {
  id: string;
  media_file_id: string;
  kind: string;
  language: string | null;
  path: string | null;
  metadata: string | null;
}

function mapMedia(row: MediaRow): MediaFile {
  return {
    id: row.id,
    sourceId: row.source_id,
    relativePath: row.relative_path,
    mediaType: row.media_type as MediaType,
    fileSize: row.file_size,
    durationMs: row.duration_ms,
    modifiedAt: row.modified_at,
    sha256: row.sha256,
    availability: row.availability as MediaAvailability,
    lastSeenAt: row.last_seen_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTrack(row: TrackRow): MediaTrack {
  return {
    id: row.id,
    mediaFileId: row.media_file_id,
    kind: row.kind as MediaTrackKind,
    language: row.language,
    path: row.path,
    metadata: decodeObject(row.metadata),
  };
}

const MEDIA_SELECT = `
  SELECT id, source_id, relative_path, media_type, file_size, duration_ms,
         modified_at, sha256, availability, last_seen_at, created_at, updated_at
  FROM media_files
`;

const TRACK_SELECT = `
  SELECT id, media_file_id, kind, language, path, metadata
  FROM media_tracks
`;

export class SqliteMediaRepository implements MediaRepository {
  constructor(private readonly db: SqliteDatabase) {}

  async create(input: CreateMediaFile): Promise<MediaFile> {
    const now = nowIso();
    const file: MediaFile = {
      id: resolveId(input.id, 'id'),
      sourceId: assertNonEmptyString(input.sourceId, 'sourceId'),
      relativePath: assertNonEmptyString(input.relativePath, 'relativePath'),
      mediaType: assertOneOf(input.mediaType, MEDIA_TYPES, 'mediaType'),
      fileSize: assertOptionalNonNegativeNumber(input.fileSize, 'fileSize'),
      durationMs: assertOptionalNonNegativeNumber(input.durationMs, 'durationMs'),
      modifiedAt: normalizeIso(input.modifiedAt, 'modifiedAt'),
      sha256: normalizeSha256(input.sha256),
      availability: input.availability
        ? assertOneOf(input.availability, MEDIA_AVAILABILITIES, 'availability')
        : 'unverified',
      lastSeenAt: normalizeIso(input.lastSeenAt, 'lastSeenAt'),
      createdAt: now,
      updatedAt: now,
    };

    try {
      this.db
        .prepare(
          `INSERT INTO media_files
             (id, source_id, relative_path, media_type, file_size, duration_ms,
              modified_at, sha256, availability, last_seen_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          file.id,
          file.sourceId,
          file.relativePath,
          file.mediaType,
          file.fileSize,
          file.durationMs,
          file.modifiedAt,
          file.sha256,
          file.availability,
          file.lastSeenAt,
          file.createdAt,
          file.updatedAt,
        );
    } catch (error) {
      throw mapSqliteError(error, 'createMediaFile');
    }
    return file;
  }

  async findById(id: string): Promise<MediaFile | null> {
    const row = this.db.prepare(`${MEDIA_SELECT} WHERE id = ?`).get(id) as MediaRow | undefined;
    return row ? mapMedia(row) : null;
  }

  async findBySourceAndRelativePath(
    sourceId: string,
    relativePath: string,
  ): Promise<MediaFile | null> {
    const row = this.db
      .prepare(`${MEDIA_SELECT} WHERE source_id = ? AND relative_path = ?`)
      .get(sourceId, relativePath) as MediaRow | undefined;
    return row ? mapMedia(row) : null;
  }

  async listBySource(sourceId: string): Promise<MediaFile[]> {
    const rows = this.db
      .prepare(`${MEDIA_SELECT} WHERE source_id = ? ORDER BY relative_path`)
      .all(sourceId) as MediaRow[];
    return rows.map(mapMedia);
  }

  async findBySha256(sha256: string): Promise<MediaFile[]> {
    const digest = normalizeSha256(sha256);
    if (digest === null) return [];
    const rows = this.db.prepare(`${MEDIA_SELECT} WHERE sha256 = ?`).all(digest) as MediaRow[];
    return rows.map(mapMedia);
  }

  async update(input: UpdateMediaFile): Promise<MediaFile> {
    const existing = await this.findById(input.id);
    if (!existing) throw new NotFoundError(`MediaFile ${input.id} not found`);

    const next: MediaFile = {
      ...existing,
      relativePath:
        input.relativePath === undefined
          ? existing.relativePath
          : assertNonEmptyString(input.relativePath, 'relativePath'),
      mediaType:
        input.mediaType === undefined
          ? existing.mediaType
          : assertOneOf(input.mediaType, MEDIA_TYPES, 'mediaType'),
      fileSize:
        input.fileSize === undefined
          ? existing.fileSize
          : assertOptionalNonNegativeNumber(input.fileSize, 'fileSize'),
      durationMs:
        input.durationMs === undefined
          ? existing.durationMs
          : assertOptionalNonNegativeNumber(input.durationMs, 'durationMs'),
      modifiedAt:
        input.modifiedAt === undefined
          ? existing.modifiedAt
          : normalizeIso(input.modifiedAt, 'modifiedAt'),
      sha256: input.sha256 === undefined ? existing.sha256 : normalizeSha256(input.sha256),
      availability:
        input.availability === undefined
          ? existing.availability
          : assertOneOf(input.availability, MEDIA_AVAILABILITIES, 'availability'),
      lastSeenAt:
        input.lastSeenAt === undefined
          ? existing.lastSeenAt
          : normalizeIso(input.lastSeenAt, 'lastSeenAt'),
      updatedAt: nowIso(),
    };

    try {
      this.db
        .prepare(
          `UPDATE media_files
             SET relative_path = ?, media_type = ?, file_size = ?, duration_ms = ?,
                 modified_at = ?, sha256 = ?, availability = ?, last_seen_at = ?,
                 updated_at = ?
           WHERE id = ?`,
        )
        .run(
          next.relativePath,
          next.mediaType,
          next.fileSize,
          next.durationMs,
          next.modifiedAt,
          next.sha256,
          next.availability,
          next.lastSeenAt,
          next.updatedAt,
          next.id,
        );
    } catch (error) {
      throw mapSqliteError(error, 'updateMediaFile');
    }
    return next;
  }

  async setAvailability(id: string, availability: MediaAvailability): Promise<void> {
    const value = assertOneOf(availability, MEDIA_AVAILABILITIES, 'availability');
    this.db
      .prepare('UPDATE media_files SET availability = ?, updated_at = ? WHERE id = ?')
      .run(value, nowIso(), id);
  }

  async delete(id: string): Promise<void> {
    // Catalog-only: the physical file is never removed here.
    this.db.prepare('DELETE FROM media_files WHERE id = ?').run(id);
  }

  async addTrack(input: CreateMediaTrack): Promise<MediaTrack> {
    const track: MediaTrack = {
      id: resolveId(input.id, 'id'),
      mediaFileId: assertNonEmptyString(input.mediaFileId, 'mediaFileId'),
      kind: assertOneOf(input.kind, MEDIA_TRACK_KINDS, 'kind'),
      language: normalizeOptionalString(input.language, 'language'),
      path: normalizeOptionalString(input.path, 'path'),
      metadata: input.metadata ?? null,
    };

    try {
      this.db
        .prepare(
          `INSERT INTO media_tracks (id, media_file_id, kind, language, path, metadata)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(
          track.id,
          track.mediaFileId,
          track.kind,
          track.language,
          track.path,
          encodeJson(track.metadata),
        );
    } catch (error) {
      throw mapSqliteError(error, 'addMediaTrack');
    }
    return track;
  }

  async listTracks(mediaFileId: string): Promise<MediaTrack[]> {
    const rows = this.db
      .prepare(`${TRACK_SELECT} WHERE media_file_id = ? ORDER BY kind, language`)
      .all(mediaFileId) as TrackRow[];
    return rows.map(mapTrack);
  }

  async deleteTrack(id: string): Promise<void> {
    this.db.prepare('DELETE FROM media_tracks WHERE id = ?').run(id);
  }
}
