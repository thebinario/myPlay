import { join } from 'node:path';
import { nowIso } from '../../../core/clock';
import type { Cue } from '../../../core/domain/subtitles';
import type { SqliteDatabase } from '../../../platform/persistence/sqlite/database';
import type {
  TranscriptStore,
  TranscriptionCandidate,
  TranscriptionStatus,
} from '../domain/transcription';

const FINGERPRINT = `COALESCE(v.file_size, '') || ':' || COALESCE(v.modified_at, '')`;

/** Videos needing a transcript: known duration, no subtitle file, not done. */
const CANDIDATES = `
  SELECT v.id AS media_file_id, v.source_id, ls.root_path, v.relative_path, v.duration_ms,
         v.sha256, ${FINGERPRINT} AS fingerprint, t.status, t.fingerprint AS transcript_fingerprint,
         t.processed_ms
    FROM media_files v
    JOIN library_sources ls ON ls.id = v.source_id
    LEFT JOIN media_transcripts t ON t.media_file_id = v.id
   WHERE v.media_type = 'video' AND v.availability = 'available' AND v.duration_ms > 0
     AND NOT EXISTS (
       SELECT 1 FROM media_tracks mt
        WHERE mt.media_file_id = v.id AND mt.kind = 'subtitle'
          AND (mt.metadata IS NULL OR json_extract(mt.metadata, '$.generated') IS NOT 1)
     )
     AND (t.media_file_id IS NULL OR t.fingerprint != ${FINGERPRINT}
          OR t.status = 'in_progress')`;

interface CandidateRow {
  media_file_id: string;
  source_id: string;
  root_path: string;
  relative_path: string;
  duration_ms: number;
  sha256: string | null;
  fingerprint: string;
  status: string | null;
  transcript_fingerprint: string | null;
  processed_ms: number | null;
}

/** SQLite persistence of local transcripts (catalog rows only). */
export class SqliteTranscriptStore implements TranscriptStore {
  constructor(private readonly db: SqliteDatabase) {}

  async listPending(sourceId: string, limit: number): Promise<TranscriptionCandidate[]> {
    const rows = this.db
      .prepare(`${CANDIDATES} AND v.source_id = ? ORDER BY v.relative_path LIMIT ?`)
      .all(sourceId, limit) as CandidateRow[];
    return rows.map((row) => ({
      mediaFileId: row.media_file_id,
      sourceId: row.source_id,
      absolutePath: join(row.root_path, row.relative_path),
      durationMs: row.duration_ms,
      sha256: row.sha256,
      fingerprint: row.fingerprint,
      processedMs:
        row.status === 'in_progress' && row.transcript_fingerprint === row.fingerprint
          ? (row.processed_ms ?? 0)
          : 0,
    }));
  }

  async begin(candidate: TranscriptionCandidate, model: string, language: string): Promise<number> {
    return this.db.transaction(() => {
      if (candidate.processedMs === 0) {
        this.db
          .prepare(`DELETE FROM transcript_segments WHERE media_file_id = ?`)
          .run(candidate.mediaFileId);
      }
      this.db
        .prepare(
          `INSERT INTO media_transcripts
             (media_file_id, status, model, language, processed_ms, fingerprint, error, updated_at)
           VALUES (?, 'in_progress', ?, ?, ?, ?, NULL, ?)
           ON CONFLICT(media_file_id) DO UPDATE SET
             status = 'in_progress', model = excluded.model, language = excluded.language,
             processed_ms = excluded.processed_ms,
             error = CASE WHEN media_transcripts.fingerprint = excluded.fingerprint
                          THEN media_transcripts.error ELSE NULL END,
             fingerprint = excluded.fingerprint, updated_at = excluded.updated_at`,
        )
        .run(
          candidate.mediaFileId,
          model,
          language,
          candidate.processedMs,
          candidate.fingerprint,
          nowIso(),
        );
      return candidate.processedMs;
    });
  }

  async appendWindow(mediaFileId: string, segments: Cue[], processedMs: number): Promise<void> {
    this.db.transaction(() => {
      const insert = this.db.prepare(
        `INSERT INTO transcript_segments (media_file_id, start_ms, end_ms, text) VALUES (?, ?, ?, ?)`,
      );
      for (const segment of segments) {
        insert.run(mediaFileId, segment.startMs, segment.endMs, segment.text);
      }
      this.db
        .prepare(
          `UPDATE media_transcripts SET processed_ms = ?, updated_at = ? WHERE media_file_id = ?`,
        )
        .run(processedMs, nowIso(), mediaFileId);
    });
  }

  async complete(mediaFileId: string): Promise<void> {
    this.setStatus(mediaFileId, 'done', null);
  }

  async fail(mediaFileId: string, error: string): Promise<void> {
    this.setStatus(mediaFileId, 'failed', error.slice(0, 500));
  }

  async noteError(mediaFileId: string, error: string): Promise<boolean> {
    const row = this.db
      .prepare(`SELECT error FROM media_transcripts WHERE media_file_id = ?`)
      .get(mediaFileId) as { error: string | null } | undefined;
    if (row?.error) {
      this.setStatus(mediaFileId, 'failed', error.slice(0, 500));
      return true;
    }
    this.db
      .prepare(`UPDATE media_transcripts SET error = ?, updated_at = ? WHERE media_file_id = ?`)
      .run(error.slice(0, 500), nowIso(), mediaFileId);
    return false;
  }

  async findTranscribedTwin(mediaFileId: string): Promise<string | null> {
    const row = this.db
      .prepare(
        `SELECT t.media_file_id FROM media_files self
           JOIN media_files twin ON twin.sha256 = self.sha256 AND twin.id != self.id
           JOIN media_transcripts t ON t.media_file_id = twin.id AND t.status = 'done'
          WHERE self.id = ? AND self.sha256 IS NOT NULL
          LIMIT 1`,
      )
      .get(mediaFileId) as { media_file_id: string } | undefined;
    return row?.media_file_id ?? null;
  }

  async copyFrom(sourceMediaFileId: string, candidate: TranscriptionCandidate): Promise<void> {
    this.db.transaction(() => {
      const source = this.db
        .prepare(`SELECT model, language FROM media_transcripts WHERE media_file_id = ?`)
        .get(sourceMediaFileId) as { model: string; language: string };
      this.db
        .prepare(`DELETE FROM transcript_segments WHERE media_file_id = ?`)
        .run(candidate.mediaFileId);
      this.db
        .prepare(
          `INSERT INTO transcript_segments (media_file_id, start_ms, end_ms, text)
           SELECT ?, start_ms, end_ms, text FROM transcript_segments
            WHERE media_file_id = ? ORDER BY start_ms`,
        )
        .run(candidate.mediaFileId, sourceMediaFileId);
      this.db
        .prepare(
          `INSERT INTO media_transcripts
             (media_file_id, status, model, language, processed_ms, fingerprint, error, updated_at)
           VALUES (?, 'done', ?, ?, ?, ?, NULL, ?)
           ON CONFLICT(media_file_id) DO UPDATE SET
             status = 'done', model = excluded.model, language = excluded.language,
             processed_ms = excluded.processed_ms, fingerprint = excluded.fingerprint,
             error = NULL, updated_at = excluded.updated_at`,
        )
        .run(
          candidate.mediaFileId,
          source.model,
          source.language,
          candidate.durationMs,
          candidate.fingerprint,
          nowIso(),
        );
    });
  }

  async status(): Promise<TranscriptionStatus> {
    const pending = (
      this.db
        .prepare(
          `SELECT COUNT(*) AS n FROM (${CANDIDATES}) WHERE status IS NULL OR status != 'in_progress'`,
        )
        .get() as {
        n: number;
      }
    ).n;
    const counts = this.db
      .prepare(
        `SELECT SUM(status = 'in_progress') AS in_progress, SUM(status = 'done') AS done,
                SUM(status = 'failed') AS failed
           FROM media_transcripts`,
      )
      .get() as { in_progress: number | null; done: number | null; failed: number | null };
    return {
      pending,
      inProgress: counts.in_progress ?? 0,
      done: counts.done ?? 0,
      failed: counts.failed ?? 0,
    };
  }

  private setStatus(mediaFileId: string, status: string, error: string | null): void {
    this.db
      .prepare(
        `UPDATE media_transcripts SET status = ?, error = ?, updated_at = ? WHERE media_file_id = ?`,
      )
      .run(status, error, nowIso(), mediaFileId);
  }
}
