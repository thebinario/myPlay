import { join } from 'node:path';
import { nowIso } from '../../../core/clock';
import type { SqliteDatabase } from '../../../platform/persistence/sqlite/database';
import type {
  PlayabilityAssessment,
  PlayabilityCandidate,
  PlayabilityStore,
} from '../domain/playability';

const UNCHECKED = `
  FROM media_files mf
  JOIN library_sources ls ON ls.id = mf.source_id
 WHERE mf.media_type = 'video' AND mf.availability = 'available'
   AND mf.playability_checked_at IS NULL`;

export class SqlitePlayabilityStore implements PlayabilityStore {
  constructor(private readonly db: SqliteDatabase) {}

  async listUnchecked(limit: number): Promise<PlayabilityCandidate[]> {
    const rows = this.db
      .prepare(
        `SELECT mf.id, ls.root_path, mf.relative_path ${UNCHECKED}
         ORDER BY mf.source_id, mf.relative_path LIMIT ?`,
      )
      .all(limit) as Array<{ id: string; root_path: string; relative_path: string }>;
    return rows.map((row) => ({
      id: row.id,
      absolutePath: join(row.root_path, row.relative_path),
    }));
  }

  async countUnchecked(): Promise<number> {
    return (this.db.prepare(`SELECT COUNT(*) AS count ${UNCHECKED}`).get() as { count: number })
      .count;
  }

  async save(id: string, assessment: PlayabilityAssessment | null, error?: string): Promise<void> {
    this.db
      .prepare(
        `UPDATE media_files
            SET playability = ?, playability_reason = ?, playability_checked_at = ?
          WHERE id = ?`,
      )
      .run(assessment?.playability ?? null, assessment?.reason ?? error ?? null, nowIso(), id);
  }
}
