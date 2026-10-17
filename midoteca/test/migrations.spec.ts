import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createMidoteca } from '../src/index';
import { createTempDatabase, type TempDatabase } from './helpers/temp-db';

describe('database initialization and migrations', () => {
  let temp: TempDatabase;

  beforeEach(() => {
    temp = createTempDatabase();
  });

  afterEach(() => {
    temp.cleanup();
  });

  it('initializes an empty database and applies all migrations', () => {
    const app = createMidoteca({ databaseFile: temp.file });
    try {
      expect(app.migration).not.toBeNull();
      expect(app.migration?.applied).toEqual([1, 2, 3, 4]);
      expect(app.migration?.currentVersion).toBe(4);
    } finally {
      app.close();
    }
  });

  it('is idempotent: a second open applies no migrations', () => {
    const first = createMidoteca({ databaseFile: temp.file });
    first.close();

    const second = createMidoteca({ databaseFile: temp.file });
    try {
      expect(second.migration?.applied).toEqual([]);
      expect(second.migration?.currentVersion).toBe(4);
    } finally {
      second.close();
    }
  });

  it('enables WAL journaling and foreign keys on file databases', () => {
    const app = createMidoteca({ databaseFile: temp.file });
    try {
      const journal = app.database.raw.pragma('journal_mode', {
        simple: true,
      });
      const foreignKeys = app.database.raw.pragma('foreign_keys', {
        simple: true,
      });
      expect(journal).toBe('wal');
      expect(foreignKeys).toBe(1);
    } finally {
      app.close();
    }
  });

  it('records applied migrations in schema_migrations', () => {
    const app = createMidoteca({ databaseFile: temp.file });
    try {
      const rows = app.database
        .prepare('SELECT id, name FROM schema_migrations ORDER BY id')
        .all() as Array<{ id: number; name: string }>;
      expect(rows).toEqual([
        { id: 1, name: '0001-initial-schema' },
        { id: 2, name: '0002-indexing' },
        { id: 3, name: '0003-course-organization' },
        { id: 4, name: '0004-library-type' },
      ]);
    } finally {
      app.close();
    }
  });

  it('creates every expected table', () => {
    const app = createMidoteca({ databaseFile: temp.file });
    try {
      const rows = app.database
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
        .all() as Array<{ name: string }>;
      const tables = rows.map((r) => r.name);
      for (const expected of [
        'library_sources',
        'media_files',
        'media_tracks',
        'courses',
        'course_modules',
        'lessons',
        'lesson_media',
        'documents',
        'document_links',
        'playback_progress',
        'reading_progress',
        'jobs',
        'app_settings',
        'schema_migrations',
      ]) {
        expect(tables).toContain(expected);
      }
    } finally {
      app.close();
    }
  });

  it('adds ordering provenance and reader columns (0003)', () => {
    const app = createMidoteca({ databaseFile: temp.file });
    try {
      const columns = (table: string) =>
        (app.database.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>).map(
          (column) => column.name,
        );
      expect(columns('course_modules')).toContain('sort_source');
      expect(columns('lessons')).toContain('sort_source');
      expect(columns('reading_progress')).toEqual(
        expect.arrayContaining(['view_mode', 'completed_at']),
      );

      const indexes = (
        app.database.prepare("SELECT name FROM sqlite_master WHERE type = 'index'").all() as Array<{
          name: string;
        }>
      ).map((row) => row.name);
      expect(indexes).toContain('ux_document_links_target');
    } finally {
      app.close();
    }
  });

  it('supports closing the connection idempotently', () => {
    const app = createMidoteca({ databaseFile: temp.file });
    app.close();
    expect(() => app.close()).not.toThrow();
    expect(app.database.isOpen).toBe(false);
  });
});
