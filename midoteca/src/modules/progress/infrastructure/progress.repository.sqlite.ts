import { nowIso } from '../../../core/clock';
import { ValidationError } from '../../../core/errors';
import {
  assertNonEmptyString,
  assertNonNegativeInteger,
  assertNonNegativeNumber,
  normalizeOptionalString,
  resolveId,
} from '../../../core/validation';
import type { PlaybackProgress, ReadingProgress } from '../domain/entities';
import type { SavePlaybackProgress, SaveReadingProgress } from '../domain/inputs';
import type { ProgressRepository } from '../domain/ports';
import type { SqliteDatabase } from '../../../platform/persistence/sqlite/database';
import { mapSqliteError } from '../../../platform/persistence/sqlite/errors';

function normalizeIso(value: unknown, field: string): string | null {
  const normalized = normalizeOptionalString(value, field);
  if (normalized === null) return null;
  if (Number.isNaN(Date.parse(normalized))) {
    throw new ValidationError(`Field "${field}" must be an ISO-8601 date string`);
  }
  return new Date(normalized).toISOString();
}

interface PlaybackRow {
  id: string;
  lesson_id: string;
  position_ms: number;
  duration_ms: number | null;
  completed_at: string | null;
  updated_at: string;
}

interface ReadingRow {
  id: string;
  document_id: string;
  page: number;
  scroll_ratio: number;
  zoom: number;
  theme: string | null;
  updated_at: string;
}

function mapPlayback(row: PlaybackRow): PlaybackProgress {
  return {
    id: row.id,
    lessonId: row.lesson_id,
    positionMs: row.position_ms,
    durationMs: row.duration_ms,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
  };
}

function mapReading(row: ReadingRow): ReadingProgress {
  return {
    id: row.id,
    documentId: row.document_id,
    page: row.page,
    scrollRatio: row.scroll_ratio,
    zoom: row.zoom,
    theme: row.theme,
    updatedAt: row.updated_at,
  };
}

export class SqliteProgressRepository implements ProgressRepository {
  constructor(private readonly db: SqliteDatabase) {}

  async savePlayback(input: SavePlaybackProgress): Promise<PlaybackProgress> {
    const lessonId = assertNonEmptyString(input.lessonId, 'lessonId');
    const positionMs = assertNonNegativeInteger(input.positionMs, 'positionMs');
    const durationMs =
      input.durationMs === undefined || input.durationMs === null
        ? null
        : assertNonNegativeInteger(input.durationMs, 'durationMs');
    const completedAt = normalizeIso(input.completedAt, 'completedAt');
    const updatedAt = nowIso();

    try {
      this.db
        .prepare(
          `INSERT INTO playback_progress
             (id, lesson_id, position_ms, duration_ms, completed_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(lesson_id) DO UPDATE SET
             position_ms  = excluded.position_ms,
             duration_ms  = excluded.duration_ms,
             completed_at = excluded.completed_at,
             updated_at   = excluded.updated_at`,
        )
        .run(resolveId(input.id, 'id'), lessonId, positionMs, durationMs, completedAt, updatedAt);
    } catch (error) {
      throw mapSqliteError(error, 'savePlaybackProgress');
    }

    const saved = await this.getPlayback(lessonId);
    if (!saved) {
      throw new ValidationError('Playback progress was not persisted');
    }
    return saved;
  }

  async getPlayback(lessonId: string): Promise<PlaybackProgress | null> {
    const row = this.db
      .prepare(
        `SELECT id, lesson_id, position_ms, duration_ms, completed_at, updated_at
         FROM playback_progress WHERE lesson_id = ?`,
      )
      .get(lessonId) as PlaybackRow | undefined;
    return row ? mapPlayback(row) : null;
  }

  async saveReading(input: SaveReadingProgress): Promise<ReadingProgress> {
    const documentId = assertNonEmptyString(input.documentId, 'documentId');
    const page = assertNonNegativeInteger(input.page, 'page');
    if (page < 1) {
      throw new ValidationError('Field "page" must be greater than or equal to 1');
    }
    const scrollRatio = assertNonNegativeNumber(input.scrollRatio, 'scrollRatio');
    if (scrollRatio > 1) {
      throw new ValidationError('Field "scrollRatio" must be between 0 and 1');
    }
    const zoom = assertNonNegativeNumber(input.zoom, 'zoom');
    if (zoom <= 0) {
      throw new ValidationError('Field "zoom" must be greater than 0');
    }
    const theme = normalizeOptionalString(input.theme, 'theme');
    const updatedAt = nowIso();

    try {
      this.db
        .prepare(
          `INSERT INTO reading_progress
             (id, document_id, page, scroll_ratio, zoom, theme, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(document_id) DO UPDATE SET
             page         = excluded.page,
             scroll_ratio = excluded.scroll_ratio,
             zoom         = excluded.zoom,
             theme        = excluded.theme,
             updated_at   = excluded.updated_at`,
        )
        .run(resolveId(input.id, 'id'), documentId, page, scrollRatio, zoom, theme, updatedAt);
    } catch (error) {
      throw mapSqliteError(error, 'saveReadingProgress');
    }

    const saved = await this.getReading(documentId);
    if (!saved) {
      throw new ValidationError('Reading progress was not persisted');
    }
    return saved;
  }

  async getReading(documentId: string): Promise<ReadingProgress | null> {
    const row = this.db
      .prepare(
        `SELECT id, document_id, page, scroll_ratio, zoom, theme, updated_at
         FROM reading_progress WHERE document_id = ?`,
      )
      .get(documentId) as ReadingRow | undefined;
    return row ? mapReading(row) : null;
  }
}
