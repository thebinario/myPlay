import type { SqliteDatabase } from '../database';
import type { Migration } from './types';

/** Adds an explicit content purpose to every registered library source. */
export const migration0004LibraryType: Migration = {
  id: 4,
  name: '0004-library-type',
  up(db: SqliteDatabase): void {
    db.exec(`
      ALTER TABLE library_sources
        ADD COLUMN library_type TEXT NOT NULL DEFAULT 'course'
        CHECK (library_type IN ('course','movie'));
    `);
  },
  down(db: SqliteDatabase): void {
    // SQLite's supported baseline cannot safely remove an additive column.
    void db;
  },
};
