import { NotFoundError, ValidationError } from '../../../core/errors';
import {
  assertNonEmptyString,
  assertOneOf,
  assertOptionalNonNegativeNumber,
  normalizeOptionalString,
  resolveId,
} from '../../../core/validation';
import { TITLE_SOURCES, type TitleSource } from '../../../core/title-source';
import type { Document, DocumentLink } from '../domain/entities';
import type { CreateDocument, CreateDocumentLink, UpdateDocument } from '../domain/inputs';
import type { DocumentRepository } from '../domain/ports';
import type { SqliteDatabase } from '../../../platform/persistence/sqlite/database';
import { mapSqliteError } from '../../../platform/persistence/sqlite/errors';

interface DocumentRow {
  id: string;
  media_file_id: string;
  title: string;
  page_count: number | null;
  detected_title: string | null;
  title_source: string;
}

interface LinkRow {
  id: string;
  document_id: string;
  course_id: string | null;
  module_id: string | null;
  lesson_id: string | null;
}

function mapDocument(row: DocumentRow): Document {
  return {
    id: row.id,
    mediaFileId: row.media_file_id,
    title: row.title,
    pageCount: row.page_count,
    detectedTitle: row.detected_title,
    titleSource: row.title_source as TitleSource,
  };
}

function mapLink(row: LinkRow): DocumentLink {
  return {
    id: row.id,
    documentId: row.document_id,
    courseId: row.course_id,
    moduleId: row.module_id,
    lessonId: row.lesson_id,
  };
}

const DOCUMENT_SELECT = `
  SELECT id, media_file_id, title, page_count, detected_title, title_source
  FROM documents
`;

export class SqliteDocumentRepository implements DocumentRepository {
  constructor(private readonly db: SqliteDatabase) {}

  async create(input: CreateDocument): Promise<Document> {
    const title = assertNonEmptyString(input.title, 'title');
    const document: Document = {
      id: resolveId(input.id, 'id'),
      mediaFileId: assertNonEmptyString(input.mediaFileId, 'mediaFileId'),
      title,
      pageCount: assertOptionalNonNegativeNumber(input.pageCount, 'pageCount'),
      detectedTitle: input.detectedTitle === undefined ? title : input.detectedTitle,
      titleSource: input.titleSource
        ? assertOneOf(input.titleSource, TITLE_SOURCES, 'titleSource')
        : 'detected',
    };
    try {
      this.db
        .prepare(
          `INSERT INTO documents
             (id, media_file_id, title, page_count, detected_title, title_source)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(
          document.id,
          document.mediaFileId,
          document.title,
          document.pageCount,
          document.detectedTitle,
          document.titleSource,
        );
    } catch (error) {
      throw mapSqliteError(error, 'createDocument');
    }
    return document;
  }

  async findById(id: string): Promise<Document | null> {
    const row = this.db.prepare(`${DOCUMENT_SELECT} WHERE id = ?`).get(id) as
      DocumentRow | undefined;
    return row ? mapDocument(row) : null;
  }

  async findByMediaFileId(mediaFileId: string): Promise<Document | null> {
    const row = this.db.prepare(`${DOCUMENT_SELECT} WHERE media_file_id = ?`).get(mediaFileId) as
      DocumentRow | undefined;
    return row ? mapDocument(row) : null;
  }

  async list(): Promise<Document[]> {
    const rows = this.db.prepare(`${DOCUMENT_SELECT} ORDER BY title`).all() as DocumentRow[];
    return rows.map(mapDocument);
  }

  async update(input: UpdateDocument): Promise<Document> {
    const existing = await this.findById(input.id);
    if (!existing) throw new NotFoundError(`Document ${input.id} not found`);

    const titleSource: TitleSource =
      input.titleSource !== undefined
        ? assertOneOf(input.titleSource, TITLE_SOURCES, 'titleSource')
        : input.title !== undefined
          ? 'manual'
          : existing.titleSource;
    const next: Document = {
      ...existing,
      title:
        input.title === undefined ? existing.title : assertNonEmptyString(input.title, 'title'),
      pageCount:
        input.pageCount === undefined
          ? existing.pageCount
          : assertOptionalNonNegativeNumber(input.pageCount, 'pageCount'),
      titleSource,
    };
    this.db
      .prepare(`UPDATE documents SET title = ?, page_count = ?, title_source = ? WHERE id = ?`)
      .run(next.title, next.pageCount, next.titleSource, next.id);
    return next;
  }

  async delete(id: string): Promise<void> {
    // Catalog-only: the underlying PDF is never removed.
    this.db.prepare('DELETE FROM documents WHERE id = ?').run(id);
  }

  async createLink(input: CreateDocumentLink): Promise<DocumentLink> {
    const link: DocumentLink = {
      id: resolveId(input.id, 'id'),
      documentId: assertNonEmptyString(input.documentId, 'documentId'),
      courseId: normalizeOptionalString(input.courseId, 'courseId'),
      moduleId: normalizeOptionalString(input.moduleId, 'moduleId'),
      lessonId: normalizeOptionalString(input.lessonId, 'lessonId'),
    };
    if (!link.courseId && !link.moduleId && !link.lessonId) {
      throw new ValidationError(
        'DocumentLink requires at least one of courseId, moduleId or lessonId',
      );
    }
    // Idempotent: re-attaching the same target returns the existing link.
    const existing = await this.findLink(link);
    if (existing) return existing;
    try {
      this.db
        .prepare(
          `INSERT INTO document_links (id, document_id, course_id, module_id, lesson_id)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .run(link.id, link.documentId, link.courseId, link.moduleId, link.lessonId);
    } catch (error) {
      throw mapSqliteError(error, 'createDocumentLink');
    }
    return link;
  }

  async findLink(input: CreateDocumentLink): Promise<DocumentLink | null> {
    const row = this.db
      .prepare(
        `SELECT id, document_id, course_id, module_id, lesson_id
         FROM document_links
         WHERE document_id = ? AND course_id IS ? AND module_id IS ? AND lesson_id IS ?`,
      )
      .get(
        input.documentId,
        normalizeOptionalString(input.courseId, 'courseId'),
        normalizeOptionalString(input.moduleId, 'moduleId'),
        normalizeOptionalString(input.lessonId, 'lessonId'),
      ) as LinkRow | undefined;
    return row ? mapLink(row) : null;
  }

  async listLinks(documentId: string): Promise<DocumentLink[]> {
    const rows = this.db
      .prepare(
        `SELECT id, document_id, course_id, module_id, lesson_id
         FROM document_links WHERE document_id = ?`,
      )
      .all(documentId) as LinkRow[];
    return rows.map(mapLink);
  }

  async listLinksByCourse(courseId: string): Promise<DocumentLink[]> {
    return this.listLinksBy('course_id', courseId);
  }

  async listLinksByModule(moduleId: string): Promise<DocumentLink[]> {
    return this.listLinksBy('module_id', moduleId);
  }

  async listLinksByLesson(lessonId: string): Promise<DocumentLink[]> {
    return this.listLinksBy('lesson_id', lessonId);
  }

  async deleteLink(id: string): Promise<void> {
    this.db.prepare('DELETE FROM document_links WHERE id = ?').run(id);
  }

  async listByCourse(courseId: string): Promise<Document[]> {
    return this.listBy('course_id', courseId);
  }

  async listByModule(moduleId: string): Promise<Document[]> {
    return this.listBy('module_id', moduleId);
  }

  async listByLesson(lessonId: string): Promise<Document[]> {
    return this.listBy('lesson_id', lessonId);
  }

  private listLinksBy(column: 'course_id' | 'module_id' | 'lesson_id', id: string): DocumentLink[] {
    const rows = this.db
      .prepare(
        `SELECT id, document_id, course_id, module_id, lesson_id
         FROM document_links WHERE ${column} = ?`,
      )
      .all(id) as LinkRow[];
    return rows.map(mapLink);
  }

  private listBy(column: 'course_id' | 'module_id' | 'lesson_id', id: string): Document[] {
    const rows = this.db
      .prepare(
        `SELECT DISTINCT d.id, d.media_file_id, d.title, d.page_count, d.detected_title, d.title_source
         FROM documents d JOIN document_links l ON l.document_id = d.id
         WHERE l.${column} = ? ORDER BY d.title`,
      )
      .all(id) as DocumentRow[];
    return rows.map(mapDocument);
  }
}
