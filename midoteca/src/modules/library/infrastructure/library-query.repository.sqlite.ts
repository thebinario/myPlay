import { resolve } from 'node:path';
import type {
  CatalogSearchFilter,
  CatalogSearchHit,
  CollectionCourseNode,
  CollectionModuleNode,
  CollectionSectionNode,
  CollectionSummary,
  CollectionTree,
  CourseSummary,
  DocumentSummary,
  Paged,
  SourceIndexState,
} from '../domain/read-models';
import type { LibraryQueryStore } from '../domain/repositories';
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

interface CatalogSearchRow {
  kind: CatalogSearchHit['kind'];
  item_id: string;
  lesson_id: string | null;
  module_id: string | null;
  course_id: string | null;
  title: string;
  context: string | null;
  source_id: string | null;
  root_path: string | null;
  relative_path: string | null;
  available: number;
}

function mapCatalogSearchHit(row: CatalogSearchRow): CatalogSearchHit {
  const title = row.kind === 'movie' ? fileTitle(row.relative_path ?? row.title) : row.title;
  return {
    kind: row.kind,
    itemId: row.item_id,
    ...(row.lesson_id ? { lessonId: row.lesson_id } : {}),
    ...(row.module_id ? { moduleId: row.module_id } : {}),
    ...(row.course_id ? { courseId: row.course_id } : {}),
    title,
    context: row.context ?? '',
    available: Boolean(row.available),
    sourceId: row.source_id,
    relativePath: row.relative_path,
    filePath:
      row.root_path && row.relative_path
        ? resolve(row.root_path, row.relative_path)
        : row.root_path,
  };
}

function fileTitle(relativePath: string): string {
  const filename = relativePath.split(/[\\/]/).pop() ?? relativePath;
  return (
    filename
      .replace(/\.[^.]+$/, '')
      .replace(/[._-]+/g, ' ')
      .trim() || filename
  );
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

interface CollectionSummaryRow {
  id: string;
  title: string;
  source_id: string;
  relative_path: string;
  title_source: string;
  updated_at: string;
  course_count: number;
}

interface CollectionRow {
  id: string;
  title: string;
  source_id: string;
}

interface CourseNodeRow {
  id: string;
  title: string;
  relative_path: string | null;
  category: string | null;
  provider: string | null;
}

interface SectionRow {
  id: string;
  title: string;
}

interface ModuleRow {
  id: string;
  title: string;
}

function mapCollectionSummary(row: CollectionSummaryRow): CollectionSummary {
  return {
    id: row.id,
    title: row.title,
    sourceId: row.source_id,
    relativePath: row.relative_path,
    titleSource: row.title_source as TitleSource,
    courseCount: row.course_count,
    updatedAt: row.updated_at,
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

  search(
    text: string,
    query: { limit: number; offset: number; filter?: CatalogSearchFilter },
  ): CatalogSearchHit[] {
    const pattern = `%${text.replace(/[%_]/g, (c) => `\\${c}`)}%`;
    const rows = this.db
      .prepare(
        `WITH hits AS (
           SELECT 'course' AS kind, c.id AS item_id, NULL AS lesson_id,
                  NULL AS module_id, c.id AS course_id, c.title,
                  COALESCE(c.description, '') AS context, s.id AS source_id,
                  s.root_path, c.relative_path,
                  CASE WHEN s.status = 'active' THEN 1 ELSE 0 END AS available
           FROM courses c LEFT JOIN library_sources s ON s.id = c.source_id
           WHERE (? = 'all' OR ? = 'course')
             AND (c.title LIKE ? ESCAPE '\\' OR COALESCE(c.description, '') LIKE ? ESCAPE '\\'
                  OR COALESCE(c.metadata, '') LIKE ? ESCAPE '\\')
           UNION ALL
           SELECT 'lesson', l.id, l.id, m.id, c.id, l.title,
                  c.title || ' • ' || m.title, mf.source_id, s.root_path, mf.relative_path,
                  CASE WHEN s.status = 'active' AND mf.availability = 'available' THEN 1 ELSE 0 END
           FROM lessons l
           JOIN course_modules m ON m.id = l.module_id
           JOIN courses c ON c.id = m.course_id
           LEFT JOIN media_files mf ON mf.id = (
             SELECT lm.media_file_id FROM lesson_media lm
             JOIN media_files primary_media ON primary_media.id = lm.media_file_id
             WHERE lm.lesson_id = l.id AND lm.role = 'primary' AND primary_media.media_type = 'video'
             ORDER BY lm.media_file_id LIMIT 1
           )
           LEFT JOIN library_sources s ON s.id = mf.source_id
           WHERE (? = 'all' OR ? = 'lesson')
             AND (l.title LIKE ? ESCAPE '\\' OR m.title LIKE ? ESCAPE '\\' OR c.title LIKE ? ESCAPE '\\')
           UNION ALL
           SELECT 'movie', mf.id, NULL, NULL, NULL, mf.relative_path,
                  COALESCE(s.display_name, ''), s.id, s.root_path, mf.relative_path,
                  CASE WHEN s.status = 'active' AND mf.availability = 'available' THEN 1 ELSE 0 END
           FROM media_files mf JOIN library_sources s ON s.id = mf.source_id
           WHERE (? = 'all' OR ? = 'movie') AND mf.media_type = 'video'
             AND (s.library_type = 'movie' OR NOT EXISTS (
               SELECT 1 FROM lesson_media lm WHERE lm.media_file_id = mf.id
             ))
             AND mf.relative_path LIKE ? ESCAPE '\\'
           UNION ALL
           SELECT 'document', d.id, NULL, NULL, NULL, d.title,
                  COALESCE(s.display_name, ''), s.id, s.root_path, mf.relative_path,
                  CASE WHEN s.status = 'active' AND mf.availability = 'available' THEN 1 ELSE 0 END
           FROM documents d JOIN media_files mf ON mf.id = d.media_file_id
           JOIN library_sources s ON s.id = mf.source_id
           WHERE (? = 'all' OR ? = 'document')
             AND (d.title LIKE ? ESCAPE '\\' OR mf.relative_path LIKE ? ESCAPE '\\')
         )
         SELECT * FROM hits ORDER BY kind COLLATE NOCASE, title COLLATE NOCASE
         LIMIT ? OFFSET ?`,
      )
      .all(
        query.filter ?? 'all',
        query.filter ?? 'all',
        pattern,
        pattern,
        pattern,
        query.filter ?? 'all',
        query.filter ?? 'all',
        pattern,
        pattern,
        pattern,
        query.filter ?? 'all',
        query.filter ?? 'all',
        pattern,
        query.filter ?? 'all',
        query.filter ?? 'all',
        pattern,
        pattern,
        query.limit,
        query.offset,
      ) as CatalogSearchRow[];
    return rows.map(mapCatalogSearchHit);
  }

  listCollections(query: {
    limit: number;
    offset: number;
    sourceId?: string;
  }): Paged<CollectionSummary> {
    const where = query.sourceId ? 'WHERE c.source_id = ?' : '';
    const params: unknown[] = query.sourceId ? [query.sourceId] : [];
    const rows = this.db
      .prepare(
        `SELECT c.id, c.title, c.source_id, c.relative_path, c.title_source, c.updated_at,
                (SELECT COUNT(*) FROM courses co WHERE co.collection_id = c.id) AS course_count
         FROM collections c
         ${where}
         ORDER BY c.title COLLATE NOCASE
         LIMIT ? OFFSET ?`,
      )
      .all(...params, query.limit, query.offset) as CollectionSummaryRow[];
    const total = this.count('collections c', where, params);
    return {
      items: rows.map(mapCollectionSummary),
      total,
      limit: query.limit,
      offset: query.offset,
    };
  }

  getCollectionTree(collectionId: string): CollectionTree | null {
    const collection = this.db
      .prepare(`SELECT id, title, source_id FROM collections WHERE id = ?`)
      .get(collectionId) as CollectionRow | undefined;
    if (!collection) return null;

    const courseRows = this.db
      .prepare(
        `SELECT id, title, relative_path, category, provider
         FROM courses WHERE collection_id = ?
         ORDER BY title COLLATE NOCASE`,
      )
      .all(collectionId) as CourseNodeRow[];

    return {
      id: collection.id,
      title: collection.title,
      sourceId: collection.source_id,
      courses: courseRows.map((course) => this.buildCourseNode(course)),
    };
  }

  private buildCourseNode(course: CourseNodeRow): CollectionCourseNode {
    const sectionRows = this.db
      .prepare(
        `SELECT id, title FROM course_sections
         WHERE course_id = ? ORDER BY sort_order, title COLLATE NOCASE`,
      )
      .all(course.id) as SectionRow[];

    const sections: CollectionSectionNode[] = sectionRows.map((section) => {
      const moduleRows = this.db
        .prepare(
          `SELECT id, title FROM course_modules
           WHERE section_id = ? ORDER BY sort_order, title COLLATE NOCASE`,
        )
        .all(section.id) as ModuleRow[];
      const modules = moduleRows.map((module) => this.buildModuleNode(module));
      return {
        id: section.id,
        title: section.title,
        modules,
        documentCount: modules.reduce((sum, module) => sum + module.documentCount, 0),
      };
    });

    const lessonCount = sections.reduce(
      (sum, section) =>
        sum + section.modules.reduce((count, module) => count + module.lessonCount, 0),
      0,
    );
    const moduleDocuments = sections.reduce((sum, section) => sum + section.documentCount, 0);
    const courseDocuments = (
      this.db
        .prepare(`SELECT COUNT(*) AS count FROM document_links WHERE course_id = ?`)
        .get(course.id) as { count: number }
    ).count;

    return {
      id: course.id,
      title: course.title,
      relativePath: course.relative_path,
      category: course.category,
      provider: course.provider,
      sections,
      lessonCount,
      documentCount: moduleDocuments + courseDocuments,
    };
  }

  private buildModuleNode(module: ModuleRow): CollectionModuleNode {
    const lessonCount = (
      this.db
        .prepare(`SELECT COUNT(*) AS count FROM lessons WHERE module_id = ?`)
        .get(module.id) as { count: number }
    ).count;
    const documentCount = (
      this.db
        .prepare(`SELECT COUNT(*) AS count FROM document_links WHERE module_id = ?`)
        .get(module.id) as { count: number }
    ).count;
    return { id: module.id, title: module.title, lessonCount, documentCount };
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
