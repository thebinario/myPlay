import { join } from 'node:path';
import { nowIso } from '../../../core/clock';
import type { MediaType } from '../../../core/domain/media-type';
import type { SqliteDatabase } from '../../../platform/persistence/sqlite/database';
import type { AnalyzableMedia, MediaAnalysisStatus, MediaAnalysisStore } from '../domain/analysis';

interface AnalyzableRow {
  id: string;
  source_id: string;
  root_path: string;
  relative_path: string;
  media_type: MediaType;
  file_size: number | null;
  duration_ms: number | null;
  sha256: string | null;
  partial_hash: string | null;
}

const ANALYZABLE_SELECT = `
  SELECT mf.id, mf.source_id, ls.root_path, mf.relative_path, mf.media_type, mf.file_size,
         mf.duration_ms, mf.sha256, mf.partial_hash
    FROM media_files mf
    JOIN library_sources ls ON ls.id = mf.source_id`;

function mapRow(row: AnalyzableRow): AnalyzableMedia {
  return {
    id: row.id,
    sourceId: row.source_id,
    absolutePath: join(row.root_path, row.relative_path),
    mediaType: row.media_type,
    fileSize: row.file_size,
    durationMs: row.duration_ms,
    sha256: row.sha256,
    partialHash: row.partial_hash,
  };
}

/** SQLite persistence for media analysis. Catalog rows only; files untouched. */
export class SqliteMediaAnalysisStore implements MediaAnalysisStore {
  constructor(private readonly db: SqliteDatabase) {}

  async listPending(sourceId: string, limit: number): Promise<AnalyzableMedia[]> {
    const rows = this.db
      .prepare(
        `${ANALYZABLE_SELECT}
         WHERE mf.source_id = ? AND mf.analyzed_at IS NULL
           AND mf.availability = 'available' AND mf.media_type IN ('video', 'pdf')
         ORDER BY mf.relative_path
         LIMIT ?`,
      )
      .all(sourceId, limit) as AnalyzableRow[];
    return rows.map(mapRow);
  }

  async saveDuration(id: string, durationMs: number): Promise<void> {
    this.db
      .prepare(`UPDATE media_files SET duration_ms = ?, updated_at = ? WHERE id = ?`)
      .run(durationMs, nowIso(), id);
  }

  async savePartialHash(id: string, partialHash: string): Promise<void> {
    this.db.prepare(`UPDATE media_files SET partial_hash = ? WHERE id = ?`).run(partialHash, id);
  }

  async saveSha256(id: string, sha256: string): Promise<void> {
    this.db.prepare(`UPDATE media_files SET sha256 = ? WHERE id = ?`).run(sha256, id);
  }

  async markAnalyzed(id: string, error: string | null): Promise<void> {
    this.db
      .prepare(`UPDATE media_files SET analyzed_at = ?, analysis_error = ? WHERE id = ?`)
      .run(nowIso(), error, id);
  }

  async findHashTwins(id: string): Promise<AnalyzableMedia[]> {
    const rows = this.db
      .prepare(
        `${ANALYZABLE_SELECT}
         JOIN media_files self ON self.id = ?
         WHERE mf.id != self.id AND mf.partial_hash = self.partial_hash
           AND mf.file_size IS self.file_size AND mf.availability = 'available'`,
      )
      .all(id) as AnalyzableRow[];
    return rows.map(mapRow);
  }

  async findFingerprintCandidates(
    id: string,
    durationMs: number,
    toleranceMs: number,
  ): Promise<AnalyzableMedia[]> {
    const rows = this.db
      .prepare(
        `${ANALYZABLE_SELECT}
         JOIN media_files self ON self.id = ?
         WHERE mf.id != self.id AND mf.media_type = 'video' AND mf.availability = 'available'
           AND mf.duration_ms BETWEEN ? AND ?
           AND (mf.sha256 IS NULL OR self.sha256 IS NULL OR mf.sha256 != self.sha256)`,
      )
      .all(id, durationMs - toleranceMs, durationMs + toleranceMs) as AnalyzableRow[];
    return rows.map(mapRow);
  }

  async getFingerprint(id: string): Promise<string[] | null> {
    const row = this.db
      .prepare(`SELECT frames FROM media_fingerprints WHERE media_file_id = ?`)
      .get(id) as { frames: string } | undefined;
    return row ? (JSON.parse(row.frames) as string[]) : null;
  }

  async saveFingerprint(id: string, frames: string[]): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO media_fingerprints (media_file_id, kind, frames, created_at)
         VALUES (?, 'dhash-16', ?, ?)
         ON CONFLICT(media_file_id) DO UPDATE SET frames = excluded.frames,
                                                  created_at = excluded.created_at`,
      )
      .run(id, JSON.stringify(frames), nowIso());
  }

  async saveDuplicateLink(a: string, b: string, similarity: number): Promise<void> {
    const [first, second] = a < b ? [a, b] : [b, a];
    this.db
      .prepare(
        `INSERT INTO media_duplicate_links (media_a, media_b, kind, similarity, created_at)
         VALUES (?, ?, 'perceptual', ?, ?)
         ON CONFLICT(media_a, media_b) DO UPDATE SET similarity = excluded.similarity`,
      )
      .run(first, second, similarity, nowIso());
  }

  async status(): Promise<MediaAnalysisStatus> {
    const row = this.db
      .prepare(
        `SELECT
           SUM(CASE WHEN analyzed_at IS NULL THEN 1 ELSE 0 END) AS pending,
           SUM(CASE WHEN analyzed_at IS NOT NULL AND analysis_error IS NULL THEN 1 ELSE 0 END) AS analyzed,
           SUM(CASE WHEN analysis_error IS NOT NULL THEN 1 ELSE 0 END) AS failed
         FROM media_files
         WHERE availability = 'available' AND media_type IN ('video', 'pdf')`,
      )
      .get() as { pending: number | null; analyzed: number | null; failed: number | null };
    return { pending: row.pending ?? 0, analyzed: row.analyzed ?? 0, failed: row.failed ?? 0 };
  }
}
