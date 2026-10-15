import type { Document, DocumentLink } from './entities';
import type { CreateDocument, CreateDocumentLink, UpdateDocument } from './inputs';

export interface DocumentRepository {
  create(input: CreateDocument): Promise<Document>;
  findById(id: string): Promise<Document | null>;
  findByMediaFileId(mediaFileId: string): Promise<Document | null>;
  list(): Promise<Document[]>;
  /** Renames a document; a title change marks the row as a manual edit. */
  update(input: UpdateDocument): Promise<Document>;
  /** Deletes only the catalog row; the underlying PDF file is never removed. */
  delete(id: string): Promise<void>;

  /** Creates a link, returning the existing one when the same target repeats. */
  createLink(input: CreateDocumentLink): Promise<DocumentLink>;
  findLink(input: CreateDocumentLink): Promise<DocumentLink | null>;
  listLinks(documentId: string): Promise<DocumentLink[]>;
  /** Every link pointing at a course, regardless of document. */
  listLinksByCourse(courseId: string): Promise<DocumentLink[]>;
  /** Every link pointing at a module, regardless of document. */
  listLinksByModule(moduleId: string): Promise<DocumentLink[]>;
  /** Every link pointing at a lesson, regardless of document. */
  listLinksByLesson(lessonId: string): Promise<DocumentLink[]>;
  deleteLink(id: string): Promise<void>;

  /** Documents associated with a course/module/lesson (join over links). */
  listByCourse(courseId: string): Promise<Document[]>;
  listByModule(moduleId: string): Promise<Document[]>;
  listByLesson(lessonId: string): Promise<Document[]>;
}
