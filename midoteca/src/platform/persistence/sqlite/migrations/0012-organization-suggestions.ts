import type { SqliteDatabase } from '../database';
import type { Migration } from './types';

/**
 * 0012 - AI-suggested course organization ("Reorganizar com IA").
 *
 * Purely additive: one row per course with the latest suggestion while the
 * user reviews it. Applying or dismissing deletes the row; deleting the course
 * cascades. `modules_json` holds `[{ title, lessonIds }]` once `ready`.
 */
export const migration0012OrganizationSuggestions: Migration = {
  id: 12,
  name: '0012-organization-suggestions',
  up(db: SqliteDatabase): void {
    db.exec(`
      CREATE TABLE course_organization_suggestions (
        course_id    TEXT PRIMARY KEY REFERENCES courses(id) ON DELETE CASCADE,
        status       TEXT NOT NULL CHECK (status IN ('pending', 'running', 'ready', 'failed')),
        modules_json TEXT NOT NULL DEFAULT '[]',
        model_id     TEXT,
        error        TEXT,
        updated_at   TEXT NOT NULL
      );
    `);
  },
  down(db: SqliteDatabase): void {
    db.exec(`DROP TABLE IF EXISTS course_organization_suggestions;`);
  },
};
