import { basename } from 'node:path';
import { nowIso } from '../../../core/clock';
import {
  assertNonEmptyString,
  assertOneOf,
  normalizeOptionalString,
  resolveId,
} from '../../../core/validation';
import {
  LIBRARY_SOURCE_STATUSES,
  type LibrarySource,
  type LibrarySourceStatus,
} from '../domain/entities';
import type {
  CreateLibrarySource,
  UpdateLibrarySourcePath,
  UpdateLibrarySourceStatus,
} from '../domain/inputs';
import type { LibraryRepository } from '../domain/ports';
import type { SqliteDatabase } from '../../../platform/persistence/sqlite/database';
import { mapSqliteError } from '../../../platform/persistence/sqlite/errors';

interface SourceRow {
  id: string;
  root_path: string;
  display_name: string | null;
  volume_id: string | null;
  status: string;
  last_scan_at: string | null;
  created_at: string;
  updated_at: string;
}

function mapRow(row: SourceRow): LibrarySource {
  return {
    id: row.id,
    rootPath: row.root_path,
    displayName: row.display_name,
    volumeId: row.volume_id,
    status: row.status as LibrarySourceStatus,
    lastScanAt: row.last_scan_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT = `
  SELECT id, root_path, display_name, volume_id, status, last_scan_at, created_at, updated_at
  FROM library_sources
`;

export class SqliteLibraryRepository implements LibraryRepository {
  constructor(private readonly db: SqliteDatabase) {}

  async createSource(input: CreateLibrarySource): Promise<LibrarySource> {
    const now = nowIso();
    const rootPath = assertNonEmptyString(input.rootPath, 'rootPath');
    const source: LibrarySource = {
      id: resolveId(input.id, 'id'),
      rootPath,
      displayName:
        normalizeOptionalString(input.displayName, 'displayName') ?? safeBasename(rootPath),
      volumeId: normalizeOptionalString(input.volumeId, 'volumeId'),
      status: input.status
        ? assertOneOf(input.status, LIBRARY_SOURCE_STATUSES, 'status')
        : 'active',
      lastScanAt: null,
      createdAt: now,
      updatedAt: now,
    };

    try {
      this.db
        .prepare(
          `INSERT INTO library_sources
             (id, root_path, display_name, volume_id, status, last_scan_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          source.id,
          source.rootPath,
          source.displayName,
          source.volumeId,
          source.status,
          source.lastScanAt,
          source.createdAt,
          source.updatedAt,
        );
    } catch (error) {
      throw mapSqliteError(error, 'createLibrarySource');
    }
    return source;
  }

  async findSourceById(id: string): Promise<LibrarySource | null> {
    const row = this.db.prepare(`${SELECT} WHERE id = ?`).get(id) as SourceRow | undefined;
    return row ? mapRow(row) : null;
  }

  async findSourceByVolumeId(volumeId: string): Promise<LibrarySource | null> {
    const row = this.db.prepare(`${SELECT} WHERE volume_id = ?`).get(volumeId) as
      SourceRow | undefined;
    return row ? mapRow(row) : null;
  }

  async findSourceByRootPath(rootPath: string): Promise<LibrarySource | null> {
    const row = this.db.prepare(`${SELECT} WHERE root_path = ?`).get(rootPath) as
      SourceRow | undefined;
    return row ? mapRow(row) : null;
  }

  async listSources(): Promise<LibrarySource[]> {
    const rows = this.db.prepare(`${SELECT} ORDER BY created_at`).all() as SourceRow[];
    return rows.map(mapRow);
  }

  async updateSourceStatus(
    id: string,
    input: UpdateLibrarySourceStatus,
  ): Promise<LibrarySource | null> {
    const existing = await this.findSourceById(id);
    if (!existing) return null;

    const status = assertOneOf(input.status, LIBRARY_SOURCE_STATUSES, 'status');
    const lastScanAt =
      input.lastScanAt === undefined
        ? existing.lastScanAt
        : input.lastScanAt === null
          ? null
          : assertNonEmptyString(input.lastScanAt, 'lastScanAt');

    this.db
      .prepare(
        `UPDATE library_sources
           SET status = ?, last_scan_at = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(status, lastScanAt, nowIso(), id);

    return this.findSourceById(id);
  }

  async updateSourcePath(
    id: string,
    input: UpdateLibrarySourcePath,
  ): Promise<LibrarySource | null> {
    const existing = await this.findSourceById(id);
    if (!existing) return null;

    const rootPath = assertNonEmptyString(input.rootPath, 'rootPath');
    const volumeId =
      input.volumeId === undefined
        ? existing.volumeId
        : normalizeOptionalString(input.volumeId, 'volumeId');

    try {
      this.db
        .prepare(
          `UPDATE library_sources
             SET root_path = ?, volume_id = ?, updated_at = ?
           WHERE id = ?`,
        )
        .run(rootPath, volumeId, nowIso(), id);
    } catch (error) {
      throw mapSqliteError(error, 'updateLibrarySourcePath');
    }
    return this.findSourceById(id);
  }

  async deleteSource(id: string): Promise<void> {
    // Idempotent. Removes only catalog rows (media/link cascades); physical
    // files on the volume are never touched.
    this.db.prepare('DELETE FROM library_sources WHERE id = ?').run(id);
  }
}

function safeBasename(p: string): string | null {
  const base = basename(p);
  return base.length > 0 ? base : null;
}
