import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createMidoteca } from '../../../../src/index';
import {
  MIGRATIONS,
  SqliteDatabase,
  runMigrations,
} from '../../../../src/platform/persistence/sqlite';
import { createTempDatabase, type TempDatabase } from '../../../helpers/temp-db';

describe('migration 0006 - watch coverage', () => {
  let temp: TempDatabase;

  beforeEach(() => {
    temp = createTempDatabase();
  });

  afterEach(() => {
    temp.cleanup();
  });

  it('keeps existing progress and tags previous completions as legacy', async () => {
    // Database as shipped in v1.0 (schema 5) with one completed and one open lesson.
    const legacy = new SqliteDatabase({ file: temp.file });
    runMigrations(
      legacy,
      MIGRATIONS.filter((migration) => migration.id <= 5),
    );
    const now = new Date().toISOString();
    legacy.exec(`INSERT INTO courses (id, title, created_at, updated_at)
                 VALUES ('c1', 'Curso', '${now}', '${now}')`);
    legacy.exec(`INSERT INTO course_modules (id, course_id, title) VALUES ('m1', 'c1', 'M1')`);
    legacy.exec(
      `INSERT INTO lessons (id, module_id, title) VALUES ('done', 'm1', 'A'), ('open', 'm1', 'B')`,
    );
    const insert = legacy.prepare(
      `INSERT INTO playback_progress (id, lesson_id, position_ms, duration_ms, completed_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    insert.run(randomUUID(), 'done', 60_000, 60_000, now, now);
    insert.run(randomUUID(), 'open', 12_000, 60_000, null, now);
    legacy.close();

    const app = createMidoteca({ databaseFile: temp.file });
    try {
      expect(app.migration?.applied).toEqual([6, 7, 8, 9, 10, 11, 12, 13]);
      const done = await app.progress.getPlayback('done');
      expect(done).toMatchObject({
        positionMs: 60_000,
        completedAt: now,
        completionSource: 'legacy',
        watchedMs: 0,
        watchedIntervals: [],
      });
      const open = await app.progress.getPlayback('open');
      expect(open).toMatchObject({ positionMs: 12_000, completedAt: null, completionSource: null });
    } finally {
      app.close();
    }
  });
});
