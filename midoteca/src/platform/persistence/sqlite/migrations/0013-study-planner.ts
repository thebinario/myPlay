import type { SqliteDatabase } from '../database';
import type { Migration } from './types';

/**
 * 0013 - Study planner (cronograma de estudos e registro de tempo).
 *
 * Purely additive. Tracks are never hard-deleted (archived instead), so the
 * time log is preserved; a removed library course only clears `course_id`.
 * `study_sessions.day` is the user's local date (YYYY-MM-DD). Player time is
 * aggregated into one row per track and day (partial unique index), so playback
 * does not create a row every ten seconds. `study_timer` holds at most one
 * running stopwatch.
 */
export const migration0013StudyPlanner: Migration = {
  id: 13,
  name: '0013-study-planner',
  up(db: SqliteDatabase): void {
    db.exec(`
      CREATE TABLE study_tracks (
        id          TEXT PRIMARY KEY,
        title       TEXT NOT NULL,
        kind        TEXT NOT NULL CHECK (kind IN ('course', 'external', 'other')),
        course_id   TEXT REFERENCES courses(id) ON DELETE SET NULL,
        platform    TEXT,
        url         TEXT,
        color       TEXT NOT NULL,
        archived_at TEXT,
        created_at  TEXT NOT NULL,
        updated_at  TEXT NOT NULL
      );
      CREATE UNIQUE INDEX ux_study_tracks_active_course
        ON study_tracks(course_id) WHERE course_id IS NOT NULL AND archived_at IS NULL;

      CREATE TABLE study_blocks (
        id               TEXT PRIMARY KEY,
        track_id         TEXT NOT NULL REFERENCES study_tracks(id) ON DELETE CASCADE,
        weekday          INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
        start_minute     INTEGER NOT NULL CHECK (start_minute BETWEEN 0 AND 1439),
        duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
        focus            TEXT,
        activity         TEXT
      );
      CREATE INDEX ix_study_blocks_day ON study_blocks(weekday, start_minute);

      CREATE TABLE study_sessions (
        id          TEXT PRIMARY KEY,
        track_id    TEXT NOT NULL REFERENCES study_tracks(id) ON DELETE CASCADE,
        day         TEXT NOT NULL,
        started_at  TEXT,
        ended_at    TEXT,
        duration_ms INTEGER NOT NULL CHECK (duration_ms >= 0),
        source      TEXT NOT NULL CHECK (source IN ('timer', 'manual', 'player')),
        activity    TEXT NOT NULL,
        note        TEXT,
        created_at  TEXT NOT NULL,
        updated_at  TEXT NOT NULL
      );
      CREATE INDEX ix_study_sessions_day ON study_sessions(day, track_id);
      CREATE UNIQUE INDEX ux_study_sessions_player_day
        ON study_sessions(track_id, day) WHERE source = 'player';

      CREATE TABLE study_timer (
        id         INTEGER PRIMARY KEY CHECK (id = 1),
        track_id   TEXT NOT NULL REFERENCES study_tracks(id) ON DELETE CASCADE,
        activity   TEXT NOT NULL,
        started_at TEXT NOT NULL,
        note       TEXT
      );
    `);
  },
  down(db: SqliteDatabase): void {
    db.exec(`
      DROP TABLE IF EXISTS study_timer;
      DROP TABLE IF EXISTS study_sessions;
      DROP TABLE IF EXISTS study_blocks;
      DROP TABLE IF EXISTS study_tracks;
    `);
  },
};
