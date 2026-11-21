import { nowIso } from '../../../core/clock';
import { ValidationError } from '../../../core/errors';
import {
  assertNonEmptyString,
  assertNonNegativeInteger,
  assertNonNegativeNumber,
  normalizeOptionalString,
  resolveId,
} from '../../../core/validation';
import {
  COMPLETION_SOURCES,
  type CompletionSource,
  type PlaybackProgress,
  type ReadingProgress,
} from '../domain/entities';
import type { SavePlaybackProgress, SaveReadingProgress, SaveWatchState } from '../domain/inputs';
import type { ProgressRepository } from '../domain/ports';
import { WatchCoverage, type WatchInterval } from '../domain/watch-coverage';
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

function normalizeCompletionSource(value: unknown): CompletionSource | null {
  if (value === undefined || value === null) return null;
  if (!COMPLETION_SOURCES.includes(value as CompletionSource)) {
    throw new ValidationError(
      `Field "completionSource" must be one of ${COMPLETION_SOURCES.join(', ')}`,
    );
  }
  return value as CompletionSource;
}

function decodeIntervals(text: string | null): WatchInterval[] {
  if (!text) return [];
  try {
    const parsed: unknown = JSON.parse(text);
    if (!Array.isArray(parsed)) return [];
    return WatchCoverage.fromIntervals(
      parsed.filter(
        (item): item is WatchInterval =>
          typeof item?.fromMs === 'number' && typeof item?.toMs === 'number',
      ),
    ).intervals;
  } catch {
    return [];
  }
}

function optionalDuration(value: number | null | undefined): number | null {
  return value === undefined || value === null
    ? null
    : assertNonNegativeInteger(Math.round(value), 'durationMs');
}

const PLAYBACK_COLUMNS = `id, lesson_id, position_ms, duration_ms, watched_ms, watched_intervals,
         completed_at, completion_source, updated_at`;

interface PlaybackRow {
  id: string;
  lesson_id: string;
  position_ms: number;
  duration_ms: number | null;
  watched_ms: number;
  watched_intervals: string | null;
  completed_at: string | null;
  completion_source: CompletionSource | null;
  updated_at: string;
}

interface ReadingRow {
  id: string;
  document_id: string;
  page: number;
  scroll_ratio: number;
  zoom: number;
  theme: string | null;
  view_mode: string | null;
  completed_at: string | null;
  updated_at: string;
}

function mapPlayback(row: PlaybackRow): PlaybackProgress {
  const watchedIntervals = decodeIntervals(row.watched_intervals);
  return {
    id: row.id,
    lessonId: row.lesson_id,
    positionMs: row.position_ms,
    durationMs: row.duration_ms,
    watchedIntervals,
    watchedMs: row.watched_ms,
    watchedRatio: WatchCoverage.fromIntervals(watchedIntervals).ratio(row.duration_ms),
    completedAt: row.completed_at,
    completionSource: row.completed_at ? row.completion_source : null,
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
    viewMode: row.view_mode,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
  };
}

export class SqliteProgressRepository implements ProgressRepository {
  constructor(private readonly db: SqliteDatabase) {}

  async savePlayback(input: SavePlaybackProgress): Promise<PlaybackProgress> {
    const lessonId = assertNonEmptyString(input.lessonId, 'lessonId');
    const positionMs = assertNonNegativeInteger(input.positionMs, 'positionMs');
    const durationMs = optionalDuration(input.durationMs);
    const completedAt = normalizeIso(input.completedAt, 'completedAt');
    const completionSource = completedAt
      ? (normalizeCompletionSource(input.completionSource) ?? 'manual')
      : null;
    const updatedAt = nowIso();

    try {
      this.db
        .prepare(
          `INSERT INTO playback_progress
             (id, lesson_id, position_ms, duration_ms, completed_at, completion_source, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(lesson_id) DO UPDATE SET
             position_ms       = excluded.position_ms,
             duration_ms       = excluded.duration_ms,
             completed_at      = excluded.completed_at,
             completion_source = excluded.completion_source,
             updated_at        = excluded.updated_at`,
        )
        .run(
          resolveId(input.id, 'id'),
          lessonId,
          positionMs,
          durationMs,
          completedAt,
          completionSource,
          updatedAt,
        );
    } catch (error) {
      throw mapSqliteError(error, 'savePlaybackProgress');
    }

    return this.requirePlayback(lessonId);
  }

  async saveWatchState(input: SaveWatchState): Promise<PlaybackProgress> {
    const lessonId = assertNonEmptyString(input.lessonId, 'lessonId');
    const positionMs = assertNonNegativeInteger(Math.round(input.positionMs), 'positionMs');
    const durationMs = optionalDuration(input.durationMs);
    const coverage = WatchCoverage.fromIntervals(input.watchedIntervals);
    const completedAt = normalizeIso(input.completedAt, 'completedAt');
    const completionSource = completedAt ? normalizeCompletionSource(input.completionSource) : null;
    const updatedAt = nowIso();

    try {
      this.db
        .prepare(
          `INSERT INTO playback_progress
             (id, lesson_id, position_ms, duration_ms, watched_ms, watched_intervals,
              completed_at, completion_source, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(lesson_id) DO UPDATE SET
             position_ms       = excluded.position_ms,
             duration_ms       = excluded.duration_ms,
             watched_ms        = excluded.watched_ms,
             watched_intervals = excluded.watched_intervals,
             completed_at      = excluded.completed_at,
             completion_source = excluded.completion_source,
             updated_at        = excluded.updated_at`,
        )
        .run(
          resolveId(undefined, 'id'),
          lessonId,
          positionMs,
          durationMs,
          Math.round(coverage.watchedMs),
          JSON.stringify(coverage.intervals),
          completedAt,
          completionSource,
          updatedAt,
        );
    } catch (error) {
      throw mapSqliteError(error, 'saveWatchState');
    }

    return this.requirePlayback(lessonId);
  }

  private async requirePlayback(lessonId: string): Promise<PlaybackProgress> {
    const saved = await this.getPlayback(lessonId);
    if (!saved) {
      throw new ValidationError('Playback progress was not persisted');
    }
    return saved;
  }

  async getPlayback(lessonId: string): Promise<PlaybackProgress | null> {
    const row = this.db
      .prepare(
        `SELECT ${PLAYBACK_COLUMNS}
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
    const viewMode = normalizeOptionalString(input.viewMode, 'viewMode');
    const completedAt = normalizeIso(input.completedAt, 'completedAt');
    const updatedAt = nowIso();

    try {
      this.db
        .prepare(
          `INSERT INTO reading_progress
             (id, document_id, page, scroll_ratio, zoom, theme, view_mode, completed_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(document_id) DO UPDATE SET
             page         = excluded.page,
             scroll_ratio = excluded.scroll_ratio,
             zoom         = excluded.zoom,
             theme        = excluded.theme,
             view_mode    = excluded.view_mode,
             completed_at = excluded.completed_at,
             updated_at   = excluded.updated_at`,
        )
        .run(
          resolveId(input.id, 'id'),
          documentId,
          page,
          scrollRatio,
          zoom,
          theme,
          viewMode,
          completedAt,
          updatedAt,
        );
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
        `SELECT id, document_id, page, scroll_ratio, zoom, theme, view_mode, completed_at, updated_at
         FROM reading_progress WHERE document_id = ?`,
      )
      .get(documentId) as ReadingRow | undefined;
    return row ? mapReading(row) : null;
  }
}
