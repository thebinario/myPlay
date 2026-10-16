import type { Document, DocumentLink } from './entities';
import type { CreateDocument, CreateDocumentLink } from './inputs';

export interface DocumentRepository {
  create(input: CreateDocument): Promise<Document>;
  findById(id: string): Promise<Document | null>;
  findByMediaFileId(mediaFileId: string): Promise<Document | null>;
  list(): Promise<Document[]>;
  /** Deletes only the catalog row; the underlying PDF file is never removed. */
  delete(id: string): Promise<void>;

  createLink(input: CreateDocumentLink): Promise<DocumentLink>;
  listLinks(documentId: string): Promise<DocumentLink[]>;
  deleteLink(id: string): Promise<void>;
}
