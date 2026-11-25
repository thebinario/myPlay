import { newId } from '../../../core/ids';
import type { SqliteDatabase } from '../../../platform/persistence/sqlite/database';
import { mapSqliteError } from '../../../platform/persistence/sqlite/errors';
import type { ActiveStudyTimer, StudyBlock, StudySession, StudyTrack } from '../domain/entities';
import type {
  AddPlayerTime,
  NewStudySession,
  StudyRepository,
  TimerChange,
} from '../domain/repositories';
import type { ValidatedBlock } from '../domain/schedule';
import type { StudyActivity, StudySessionSource, StudyTrackKind } from '../domain/types';

interface TrackRow {
  id: string;
  title: string;
  kind: string;
  course_id: string | null;
  platform: string | null;
  url: string | null;
  color: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

interface BlockRow {
  id: string;
  track_id: string;
  weekday: number;
  start_minute: number;
  duration_minutes: number;
  focus: string | null;
  activity: string | null;
}

interface SessionRow {
  id: string;
  track_id: string;
  day: string;
  started_at: string | null;
  ended_at: string | null;
  duration_ms: number;
  source: string;
  activity: string;
  note: string | null;
  created_at: string;
  updated_at: string;
}

interface TimerRow {
  track_id: string;
  activity: string;
  started_at: string;
  note: string | null;
}

const mapTrack = (row: TrackRow): StudyTrack => ({
  id: row.id,
  title: row.title,
  kind: row.kind as StudyTrackKind,
  courseId: row.course_id,
  platform: row.platform,
  url: row.url,
  color: row.color,
  archivedAt: row.archived_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapBlock = (row: BlockRow): StudyBlock => ({
  id: row.id,
  trackId: row.track_id,
  weekday: row.weekday,
  startMinute: row.start_minute,
  durationMinutes: row.duration_minutes,
  focus: row.focus,
  activity: row.activity as StudyActivity | null,
});

const mapSession = (row: SessionRow): StudySession => ({
  id: row.id,
  trackId: row.track_id,
  day: row.day,
  startedAt: row.started_at,
  endedAt: row.ended_at,
  durationMs: row.duration_ms,
  source: row.source as StudySessionSource,
  activity: row.activity as StudyActivity,
  note: row.note,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const TRACK_COLUMNS = `id, title, kind, course_id, platform, url, color, archived_at, created_at, updated_at`;
const SESSION_COLUMNS = `id, track_id, day, started_at, ended_at, duration_ms, source, activity, note,
  created_at, updated_at`;

export class SqliteStudyRepository implements StudyRepository {
  constructor(private readonly db: SqliteDatabase) {}

  async listTracks({ includeArchived }: { includeArchived: boolean }): Promise<StudyTrack[]> {
    const rows = this.db
      .prepare(
        `SELECT ${TRACK_COLUMNS} FROM study_tracks
         ${includeArchived ? '' : 'WHERE archived_at IS NULL'}
         ORDER BY archived_at IS NOT NULL, created_at, title`,
      )
      .all() as TrackRow[];
    return rows.map(mapTrack);
  }

  async findTrack(id: string): Promise<StudyTrack | null> {
    const row = this.db
      .prepare(`SELECT ${TRACK_COLUMNS} FROM study_tracks WHERE id = ?`)
      .get(id) as TrackRow | undefined;
    return row ? mapTrack(row) : null;
  }

  async findTrackByCourse(courseId: string): Promise<StudyTrack | null> {
    const row = this.db
      .prepare(
        `SELECT ${TRACK_COLUMNS} FROM study_tracks WHERE course_id = ?
         ORDER BY archived_at IS NOT NULL, archived_at DESC LIMIT 1`,
      )
      .get(courseId) as TrackRow | undefined;
    return row ? mapTrack(row) : null;
  }

  async saveTrack(track: StudyTrack): Promise<StudyTrack> {
    try {
      this.db
        .prepare(
          `INSERT INTO study_tracks (${TRACK_COLUMNS})
           VALUES (@id, @title, @kind, @courseId, @platform, @url, @color, @archivedAt, @createdAt, @updatedAt)
           ON CONFLICT(id) DO UPDATE SET
             title = excluded.title, kind = excluded.kind, course_id = excluded.course_id,
             platform = excluded.platform, url = excluded.url, color = excluded.color,
             archived_at = excluded.archived_at, updated_at = excluded.updated_at`,
        )
        .run(track);
    } catch (error) {
      throw mapSqliteError(error, 'saveStudyTrack');
    }
    return (await this.findTrack(track.id)) as StudyTrack;
  }

  async archiveTrack(id: string, at: string): Promise<void> {
    this.db.transaction(() => {
      this.db.prepare('DELETE FROM study_blocks WHERE track_id = ?').run(id);
      this.db
        .prepare('UPDATE study_tracks SET archived_at = ?, updated_at = ? WHERE id = ?')
        .run(at, at, id);
    });
  }

  async listBlocks(): Promise<StudyBlock[]> {
    const rows = this.db
      .prepare(
        `SELECT id, track_id, weekday, start_minute, duration_minutes, focus, activity
         FROM study_blocks ORDER BY weekday, start_minute`,
      )
      .all() as BlockRow[];
    return rows.map(mapBlock);
  }

  async replaceSchedule(blocks: readonly ValidatedBlock[]): Promise<StudyBlock[]> {
    const insert = this.db.prepare(
      `INSERT INTO study_blocks (id, track_id, weekday, start_minute, duration_minutes, focus, activity)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    try {
      this.db.transaction(() => {
        this.db.exec('DELETE FROM study_blocks');
        for (const block of blocks) {
          insert.run(
            block.id || newId(),
            block.trackId,
            block.weekday,
            block.startMinute,
            block.durationMinutes,
            block.focus,
            block.activity,
          );
        }
      });
    } catch (error) {
      throw mapSqliteError(error, 'saveStudySchedule');
    }
    return this.listBlocks();
  }

  async insertSession(session: NewStudySession): Promise<StudySession> {
    return this.insertSessionSync(session);
  }

  private insertSessionSync(session: NewStudySession): StudySession {
    const id = newId();
    const now = new Date().toISOString();
    try {
      this.db
        .prepare(
          `INSERT INTO study_sessions (${SESSION_COLUMNS})
           VALUES (@id, @trackId, @day, @startedAt, @endedAt, @durationMs, @source, @activity, @note,
                   @createdAt, @updatedAt)`,
        )
        .run({ ...session, id, createdAt: now, updatedAt: now });
    } catch (error) {
      throw mapSqliteError(error, 'insertStudySession');
    }
    const row = this.db
      .prepare(`SELECT ${SESSION_COLUMNS} FROM study_sessions WHERE id = ?`)
      .get(id) as SessionRow;
    return mapSession(row);
  }

  async addPlayerTime({ trackId, day, ms, at }: AddPlayerTime): Promise<void> {
    try {
      this.db
        .prepare(
          `INSERT INTO study_sessions (${SESSION_COLUMNS})
           VALUES (?, ?, ?, ?, ?, ?, 'player', 'lesson', NULL, ?, ?)
           ON CONFLICT(track_id, day) WHERE source = 'player' DO UPDATE SET
             duration_ms = duration_ms + excluded.duration_ms,
             ended_at = excluded.ended_at,
             updated_at = excluded.updated_at`,
        )
        .run(newId(), trackId, day, at, at, ms, at, at);
    } catch (error) {
      throw mapSqliteError(error, 'addStudyPlayerTime');
    }
  }

  async deleteSession(id: string): Promise<boolean> {
    return this.db.prepare('DELETE FROM study_sessions WHERE id = ?').run(id).changes > 0;
  }

  async listSessions(from: string, to: string): Promise<StudySession[]> {
    const rows = this.db
      .prepare(
        `SELECT ${SESSION_COLUMNS} FROM study_sessions WHERE day BETWEEN ? AND ?
         ORDER BY day, COALESCE(started_at, created_at), created_at`,
      )
      .all(from, to) as SessionRow[];
    return rows.map(mapSession);
  }

  async getTimer(): Promise<ActiveStudyTimer | null> {
    const row = this.db
      .prepare('SELECT track_id, activity, started_at, note FROM study_timer WHERE id = 1')
      .get() as TimerRow | undefined;
    return row
      ? {
          trackId: row.track_id,
          activity: row.activity as StudyActivity,
          startedAt: row.started_at,
          note: row.note,
        }
      : null;
  }

  async commitTimer({ finished, next }: TimerChange): Promise<StudySession | null> {
    return this.db.transaction(() => {
      const session = finished ? this.insertSessionSync(finished) : null;
      this.db.exec('DELETE FROM study_timer');
      if (next) {
        this.db
          .prepare(
            'INSERT INTO study_timer (id, track_id, activity, started_at, note) VALUES (1, ?, ?, ?, ?)',
          )
          .run(next.trackId, next.activity, next.startedAt, next.note);
      }
      return session;
    });
  }
}
