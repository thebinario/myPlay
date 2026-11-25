import type { SqliteDatabase } from '../../../platform/persistence/sqlite/database';
import type {
  OrganizationSuggestion,
  SuggestedModule,
  SuggestionStatus,
} from '../domain/organization-suggestion';
import type { OrganizationSuggestionRepository } from '../domain/suggestion-ports';

interface SuggestionRow {
  course_id: string;
  status: SuggestionStatus;
  modules_json: string;
  model_id: string | null;
  error: string | null;
  updated_at: string;
}

export class SqliteOrganizationSuggestionRepository implements OrganizationSuggestionRepository {
  constructor(private readonly db: SqliteDatabase) {}

  async get(courseId: string): Promise<OrganizationSuggestion | null> {
    const row = this.db
      .prepare(`SELECT * FROM course_organization_suggestions WHERE course_id = ?`)
      .get(courseId) as SuggestionRow | undefined;
    if (!row) return null;
    return {
      courseId: row.course_id,
      status: row.status,
      modules: JSON.parse(row.modules_json) as SuggestedModule[],
      modelId: row.model_id,
      error: row.error,
      updatedAt: row.updated_at,
    };
  }

  async save(suggestion: OrganizationSuggestion): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO course_organization_suggestions
           (course_id, status, modules_json, model_id, error, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(course_id) DO UPDATE SET
           status = excluded.status, modules_json = excluded.modules_json,
           model_id = excluded.model_id, error = excluded.error, updated_at = excluded.updated_at`,
      )
      .run(
        suggestion.courseId,
        suggestion.status,
        JSON.stringify(suggestion.modules),
        suggestion.modelId,
        suggestion.error,
        suggestion.updatedAt,
      );
  }

  async delete(courseId: string): Promise<void> {
    this.db
      .prepare(`DELETE FROM course_organization_suggestions WHERE course_id = ?`)
      .run(courseId);
  }
}
