import { join, isAbsolute } from 'node:path';
import { nowIso } from '../../../core/clock';
import type { SqliteDatabase } from '../../../platform/persistence/sqlite/database';
import type {
  ContentChunkInput,
  ContentHit,
  ContentIndexStatus,
  ContentIndexStore,
  ContentSourceKind,
  PendingExtraction,
  RetrievalScope,
  RetrievalStore,
} from '../domain/ports';

/** Media files whose text belongs to the scope (lesson videos and linked PDFs). */
function scopeMedia(scope: RetrievalScope): { sql: string; params: string[] } | null {
  if (scope.documentId) {
    return { sql: `SELECT media_file_id FROM documents WHERE id = ?`, params: [scope.documentId] };
  }
  if (scope.lessonId) {
    return {
      sql: `SELECT media_file_id FROM lesson_media WHERE lesson_id = ? AND role = 'primary'
            UNION SELECT d.media_file_id FROM document_links dl
              JOIN documents d ON d.id = dl.document_id WHERE dl.lesson_id = ?`,
      params: [scope.lessonId, scope.lessonId],
    };
  }
  if (scope.courseId) {
    return {
      sql: `SELECT lm.media_file_id FROM lesson_media lm
              JOIN lessons l ON l.id = lm.lesson_id
              JOIN course_modules cm ON cm.id = l.module_id
             WHERE cm.course_id = ? AND lm.role = 'primary'
            UNION SELECT d.media_file_id FROM document_links dl
              JOIN documents d ON d.id = dl.document_id
              LEFT JOIN course_modules m ON m.id = dl.module_id
              LEFT JOIN lessons l2 ON l2.id = dl.lesson_id
              LEFT JOIN course_modules m2 ON m2.id = l2.module_id
             WHERE dl.course_id = ? OR m.course_id = ? OR m2.course_id = ?`,
      params: [scope.courseId, scope.courseId, scope.courseId, scope.courseId],
    };
  }
  return null;
}

const FINGERPRINT = (alias: string) =>
  `COALESCE(${alias}.file_size, '') || ':' || COALESCE(${alias}.modified_at, '')`;

const PENDING_SQL = `
  SELECT * FROM (
    SELECT mf.id AS media_file_id, 'pdf' AS origin_key, 'pdf' AS source_kind,
           ls.root_path, mf.relative_path AS file_path, NULL AS language,
           ${FINGERPRINT('mf')} AS fingerprint, s.fingerprint AS indexed_fingerprint
      FROM media_files mf
      JOIN library_sources ls ON ls.id = mf.source_id
      LEFT JOIN content_extraction_state s
             ON s.media_file_id = mf.id AND s.origin_key = 'pdf'
     WHERE mf.source_id = @sourceId AND mf.media_type = 'pdf' AND mf.availability = 'available'
    UNION ALL
    SELECT t.media_file_id, 'subtitle:' || t.id, 'subtitle',
           ls.root_path, t.path, t.language,
           ${FINGERPRINT('sm')}, s.fingerprint
      FROM media_tracks t
      JOIN media_files v ON v.id = t.media_file_id AND v.availability = 'available'
      JOIN library_sources ls ON ls.id = v.source_id
      LEFT JOIN media_files sm ON sm.source_id = v.source_id AND sm.relative_path = t.path
      LEFT JOIN content_extraction_state s
             ON s.media_file_id = t.media_file_id AND s.origin_key = 'subtitle:' || t.id
     WHERE v.source_id = @sourceId AND t.kind = 'subtitle' AND t.path IS NOT NULL
       AND (sm.id IS NULL OR sm.availability = 'available')
       AND (t.metadata IS NULL OR json_extract(t.metadata, '$.generated') IS NOT 1)
    UNION ALL
    SELECT tr.media_file_id, 'transcript', 'transcript', ls.root_path, '', tr.language,
           tr.updated_at, s.fingerprint
      FROM media_transcripts tr
      JOIN media_files v ON v.id = tr.media_file_id AND v.availability = 'available'
      JOIN library_sources ls ON ls.id = v.source_id
      LEFT JOIN content_extraction_state s
             ON s.media_file_id = tr.media_file_id AND s.origin_key = 'transcript'
     WHERE v.source_id = @sourceId AND tr.status = 'done'
  )
  WHERE indexed_fingerprint IS NULL OR indexed_fingerprint != fingerprint
  LIMIT @limit`;

const SEARCH_SQL = `
  SELECT c.id AS chunk_id, c.source_kind, c.media_file_id, c.language, c.page,
         c.start_ms, c.end_ms,
         snippet(content_chunks_fts, 0, '[[', ']]', '…', 18) AS snippet,
         bm25(content_chunks_fts) AS score,
         d.id AS document_id, d.title AS document_title,
         l.id AS lesson_id, l.title AS lesson_title,
         co.id AS course_id, co.title AS course_title
    FROM content_chunks_fts
    JOIN content_chunks c ON c.id = content_chunks_fts.rowid
    JOIN media_files mf ON mf.id = c.media_file_id AND mf.availability = 'available'
    LEFT JOIN documents d ON d.media_file_id = c.media_file_id
    LEFT JOIN lesson_media lm ON lm.media_file_id = c.media_file_id AND lm.role = 'primary'
    LEFT JOIN lessons l ON l.id = lm.lesson_id
    LEFT JOIN course_modules cm ON cm.id = l.module_id
    LEFT JOIN courses co ON co.id = cm.course_id
   WHERE content_chunks_fts MATCH ?
   ORDER BY score
   LIMIT ?`;

interface PendingRow {
  media_file_id: string;
  origin_key: string;
  source_kind: ContentSourceKind;
  root_path: string;
  file_path: string;
  language: string | null;
  fingerprint: string;
}

interface HitRow {
  chunk_id: number;
  source_kind: ContentSourceKind;
  media_file_id: string;
  language: string | null;
  page: number | null;
  start_ms: number | null;
  end_ms: number | null;
  snippet: string;
  score: number;
  document_id: string | null;
  document_title: string | null;
  lesson_id: string | null;
  lesson_title: string | null;
  course_id: string | null;
  course_title: string | null;
}

function mapHit(row: HitRow): ContentHit {
  return {
    chunkId: row.chunk_id,
    sourceKind: row.source_kind,
    snippet: row.snippet,
    score: row.score,
    mediaFileId: row.media_file_id,
    language: row.language,
    documentId: row.document_id,
    documentTitle: row.document_title,
    page: row.page,
    lessonId: row.lesson_id,
    lessonTitle: row.lesson_title,
    courseId: row.course_id,
    courseTitle: row.course_title,
    startMs: row.start_ms,
    endMs: row.end_ms,
  };
}

/** SQLite + FTS5 persistence of extracted text. Catalog rows only. */
export class SqliteContentIndexStore implements ContentIndexStore, RetrievalStore {
  constructor(private readonly db: SqliteDatabase) {}

  async listPending(sourceId: string, limit: number): Promise<PendingExtraction[]> {
    const rows = this.db.prepare(PENDING_SQL).all({ sourceId, limit }) as PendingRow[];
    return rows.map((row) => ({
      mediaFileId: row.media_file_id,
      originKey: row.origin_key,
      sourceKind: row.source_kind,
      absolutePath: isAbsolute(row.file_path) ? row.file_path : join(row.root_path, row.file_path),
      language: row.language,
      fingerprint: row.fingerprint,
    }));
  }

  async replaceChunks(item: PendingExtraction, chunks: ContentChunkInput[]): Promise<void> {
    this.db.transaction(() => {
      this.deleteChunks(item);
      const insert = this.db.prepare(
        `INSERT INTO content_chunks
           (media_file_id, origin_key, source_kind, language, page, start_ms, end_ms, text)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      );
      for (const chunk of chunks) {
        insert.run(
          item.mediaFileId,
          item.originKey,
          item.sourceKind,
          item.language,
          chunk.page ?? null,
          chunk.startMs ?? null,
          chunk.endMs ?? null,
          chunk.text,
        );
      }
      this.saveState(item, 'done', null);
    });
  }

  async markFailed(item: PendingExtraction, error: string): Promise<void> {
    this.db.transaction(() => {
      this.deleteChunks(item);
      this.saveState(item, 'failed', error.slice(0, 500));
    });
  }

  async search(ftsQuery: string, limit: number): Promise<ContentHit[]> {
    const rows = this.db.prepare(SEARCH_SQL).all(ftsQuery, limit) as HitRow[];
    return rows.map(mapHit);
  }

  async rankByKeywords(ftsQuery: string, limit: number, scope: RetrievalScope): Promise<number[]> {
    const media = scopeMedia(scope);
    const rows = this.db
      .prepare(
        `SELECT c.id FROM content_chunks_fts
           JOIN content_chunks c ON c.id = content_chunks_fts.rowid
           JOIN media_files mf ON mf.id = c.media_file_id AND mf.availability = 'available'
          WHERE content_chunks_fts MATCH ?
            ${media ? `AND c.media_file_id IN (${media.sql})` : ''}
          ORDER BY bm25(content_chunks_fts)
          LIMIT ?`,
      )
      .all(ftsQuery, ...(media?.params ?? []), limit) as Array<{ id: number }>;
    return rows.map((row) => row.id);
  }

  async chunkIdsInScope(scope: RetrievalScope): Promise<Set<number> | null> {
    const media = scopeMedia(scope);
    if (!media) return null;
    const rows = this.db
      .prepare(`SELECT id FROM content_chunks WHERE media_file_id IN (${media.sql})`)
      .all(...media.params) as Array<{ id: number }>;
    return new Set(rows.map((row) => row.id));
  }

  async hitsByIds(chunkIds: number[]): Promise<ContentHit[]> {
    if (chunkIds.length === 0) return [];
    const placeholders = chunkIds.map(() => '?').join(', ');
    const rows = this.db
      .prepare(
        `SELECT c.id AS chunk_id, c.source_kind, c.media_file_id, c.language, c.page,
                c.start_ms, c.end_ms, c.text AS snippet, 0 AS score,
                d.id AS document_id, d.title AS document_title,
                l.id AS lesson_id, l.title AS lesson_title,
                co.id AS course_id, co.title AS course_title
           FROM content_chunks c
           JOIN media_files mf ON mf.id = c.media_file_id AND mf.availability = 'available'
           LEFT JOIN documents d ON d.media_file_id = c.media_file_id
           LEFT JOIN lesson_media lm ON lm.media_file_id = c.media_file_id AND lm.role = 'primary'
           LEFT JOIN lessons l ON l.id = lm.lesson_id
           LEFT JOIN course_modules cm ON cm.id = l.module_id
           LEFT JOIN courses co ON co.id = cm.course_id
          WHERE c.id IN (${placeholders})`,
      )
      .all(...chunkIds) as HitRow[];
    return rows.map(mapHit);
  }

  async status(): Promise<ContentIndexStatus> {
    const states = this.db
      .prepare(
        `SELECT SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS indexed,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed
           FROM content_extraction_state`,
      )
      .get() as { indexed: number | null; failed: number | null };
    const { chunks } = this.db.prepare(`SELECT COUNT(*) AS chunks FROM content_chunks`).get() as {
      chunks: number;
    };
    return { indexed: states.indexed ?? 0, failed: states.failed ?? 0, chunks };
  }

  private deleteChunks(item: PendingExtraction): void {
    this.db
      .prepare(`DELETE FROM content_chunks WHERE media_file_id = ? AND origin_key = ?`)
      .run(item.mediaFileId, item.originKey);
  }

  private saveState(
    item: PendingExtraction,
    status: 'done' | 'failed',
    error: string | null,
  ): void {
    this.db
      .prepare(
        `INSERT INTO content_extraction_state
           (media_file_id, origin_key, fingerprint, status, error, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(media_file_id, origin_key) DO UPDATE SET
           fingerprint = excluded.fingerprint, status = excluded.status,
           error = excluded.error, updated_at = excluded.updated_at`,
      )
      .run(item.mediaFileId, item.originKey, item.fingerprint, status, error, nowIso());
  }
}
