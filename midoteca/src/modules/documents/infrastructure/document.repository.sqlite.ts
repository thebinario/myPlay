import { ValidationError } from '../../../core/errors';
import {
  assertNonEmptyString,
  assertOneOf,
  assertOptionalNonNegativeNumber,
  normalizeOptionalString,
  resolveId,
} from '../../../core/validation';
import { TITLE_SOURCES, type TitleSource } from '../../../core/title-source';
import type { Document, DocumentLink } from '../domain/entities';
import type { CreateDocument, CreateDocumentLink } from '../domain/inputs';
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

  async listLinks(documentId: string): Promise<DocumentLink[]> {
    const rows = this.db
      .prepare(
        `SELECT id, document_id, course_id, module_id, lesson_id
         FROM document_links WHERE document_id = ?`,
      )
      .all(documentId) as LinkRow[];
    return rows.map(mapLink);
  }

  async deleteLink(id: string): Promise<void> {
    this.db.prepare('DELETE FROM document_links WHERE id = ?').run(id);
  }
}
