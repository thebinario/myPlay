import type {
  CourseSummary,
  DocumentSummary,
  LibraryQueryStore,
  Paged,
  SearchResult,
  SourceIndexState,
} from '../domain/queries';
import type { LibrarySourceStatus } from '../domain/entities';
import type { TitleSource } from '../../../core/title-source';
import type { SqliteDatabase } from '../../../platform/persistence/sqlite/database';

interface CourseSummaryRow {
  id: string;
  title: string;
  source_id: string | null;
  relative_path: string | null;
  title_source: string;
  updated_at: string;
  module_count: number;
  lesson_count: number;
}

interface DocumentSummaryRow {
  id: string;
  title: string;
  media_file_id: string;
  title_source: string;
  page_count: number | null;
}

function mapCourseSummary(row: CourseSummaryRow): CourseSummary {
  return {
    id: row.id,
    title: row.title,
    sourceId: row.source_id,
    relativePath: row.relative_path,
    titleSource: row.title_source as TitleSource,
    moduleCount: row.module_count,
    lessonCount: row.lesson_count,
    updatedAt: row.updated_at,
  };
}

function mapDocumentSummary(row: DocumentSummaryRow): DocumentSummary {
  return {
    id: row.id,
    title: row.title,
    mediaFileId: row.media_file_id,
    titleSource: row.title_source as TitleSource,
    pageCount: row.page_count,
  };
}

export class SqliteLibraryQueryStore implements LibraryQueryStore {
  constructor(private readonly db: SqliteDatabase) {}

  listCourses(query: { limit: number; offset: number; sourceId?: string }): Paged<CourseSummary> {
    const where = query.sourceId ? 'WHERE c.source_id = ?' : '';
    const params: unknown[] = query.sourceId ? [query.sourceId] : [];
    const rows = this.db
      .prepare(
        `SELECT c.id, c.title, c.source_id, c.relative_path, c.title_source,
                c.updated_at,
                (SELECT COUNT(*) FROM course_modules m WHERE m.course_id = c.id)
                  AS module_count,
                (SELECT COUNT(*) FROM lessons l
                   JOIN course_modules m2 ON l.module_id = m2.id
                   WHERE m2.course_id = c.id) AS lesson_count
         FROM courses c
         ${where}
         ORDER BY c.title COLLATE NOCASE
         LIMIT ? OFFSET ?`,
      )
      .all(...params, query.limit, query.offset) as CourseSummaryRow[];
    const total = this.count('courses c', where, params);
    return {
      items: rows.map(mapCourseSummary),
      total,
      limit: query.limit,
      offset: query.offset,
    };
  }

  listDocuments(query: {
    limit: number;
    offset: number;
    sourceId?: string;
  }): Paged<DocumentSummary> {
    const where = query.sourceId ? 'WHERE m.source_id = ?' : '';
    const params: unknown[] = query.sourceId ? [query.sourceId] : [];
    const rows = this.db
      .prepare(
        `SELECT d.id, d.title, d.media_file_id, d.title_source, d.page_count
         FROM documents d
         JOIN media_files m ON m.id = d.media_file_id
         ${where}
         ORDER BY d.title COLLATE NOCASE
         LIMIT ? OFFSET ?`,
      )
      .all(...params, query.limit, query.offset) as DocumentSummaryRow[];
    const total = this.count(
      'documents d JOIN media_files m ON m.id = d.media_file_id',
      where,
      params,
    );
    return {
      items: rows.map(mapDocumentSummary),
      total,
      limit: query.limit,
      offset: query.offset,
    };
  }

  search(text: string, query: { limit: number; offset: number }): SearchResult {
    const pattern = `%${text.replace(/[%_]/g, (c) => `\\${c}`)}%`;
    const courseRows = this.db
      .prepare(
        `SELECT c.id, c.title, c.source_id, c.relative_path, c.title_source,
                c.updated_at,
                (SELECT COUNT(*) FROM course_modules m WHERE m.course_id = c.id)
                  AS module_count,
                (SELECT COUNT(*) FROM lessons l
                   JOIN course_modules m2 ON l.module_id = m2.id
                   WHERE m2.course_id = c.id) AS lesson_count
         FROM courses c
         WHERE c.title LIKE ? ESCAPE '\\'
         ORDER BY c.title COLLATE NOCASE
         LIMIT ? OFFSET ?`,
      )
      .all(pattern, query.limit, query.offset) as CourseSummaryRow[];
    const documentRows = this.db
      .prepare(
        `SELECT d.id, d.title, d.media_file_id, d.title_source, d.page_count
         FROM documents d
         WHERE d.title LIKE ? ESCAPE '\\'
         ORDER BY d.title COLLATE NOCASE
         LIMIT ? OFFSET ?`,
      )
      .all(pattern, query.limit, query.offset) as DocumentSummaryRow[];
    return {
      courses: courseRows.map(mapCourseSummary),
      documents: documentRows.map(mapDocumentSummary),
    };
  }

  getSourceIndexState(sourceId: string): SourceIndexState | null {
    const source = this.db
      .prepare(`SELECT status, last_scan_at FROM library_sources WHERE id = ?`)
      .get(sourceId) as { status: string; last_scan_at: string | null } | undefined;
    if (!source) return null;
    const media = this.db
      .prepare('SELECT COUNT(*) AS count FROM media_files WHERE source_id = ?')
      .get(sourceId) as { count: number };
    const courses = this.db
      .prepare('SELECT COUNT(*) AS count FROM courses WHERE source_id = ?')
      .get(sourceId) as { count: number };
    return {
      sourceId,
      status: source.status as LibrarySourceStatus,
      lastScanAt: source.last_scan_at,
      mediaCount: media.count,
      courseCount: courses.count,
    };
  }

  private count(fromClause: string, where: string, params: unknown[]): number {
    const row = this.db
      .prepare(`SELECT COUNT(*) AS count FROM ${fromClause} ${where}`)
      .get(...params) as { count: number };
    return row.count;
  }
}
