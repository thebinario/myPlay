import { NotFoundError } from '../../../core/errors';
import type { Document, DocumentLink } from './entities';
import type { CreateDocumentLink } from './inputs';
import type { DocumentRepository } from './ports';

export interface DocumentDetails {
  document: Document;
  links: DocumentLink[];
}

/**
 * Application service for document associations. A PDF may be attached to a
 * course, module and/or lesson; detaching never deletes the physical file nor
 * the document row. All invariants that span reads + writes live here, while
 * atomic persistence stays in the repository adapter.
 */
export class DocumentAssociationService {
  constructor(private readonly documents: DocumentRepository) {}

  listCourseDocuments(courseId: string): Promise<Document[]> {
    return this.documents.listByCourse(courseId);
  }

  listModuleDocuments(moduleId: string): Promise<Document[]> {
    return this.documents.listByModule(moduleId);
  }

  listLessonDocuments(lessonId: string): Promise<Document[]> {
    return this.documents.listByLesson(lessonId);
  }

  attachToCourse(documentId: string, courseId: string): Promise<DocumentLink> {
    return this.attach({ documentId, courseId });
  }

  attachToModule(documentId: string, moduleId: string): Promise<DocumentLink> {
    return this.attach({ documentId, moduleId });
  }

  attachToLesson(documentId: string, lessonId: string): Promise<DocumentLink> {
    return this.attach({ documentId, lessonId });
  }

  /** Idempotent: re-attaching the same target returns the existing link. */
  attach(input: CreateDocumentLink): Promise<DocumentLink> {
    return this.documents.createLink(input);
  }

  /** Detaches a link by id. The document and its file remain untouched. */
  async detach(linkId: string): Promise<void> {
    return this.documents.deleteLink(linkId);
  }

  /** Detaches every link of a document (keeps the document row and file). */
  async detachAll(documentId: string): Promise<void> {
    const links = await this.documents.listLinks(documentId);
    for (const link of links) {
      await this.documents.deleteLink(link.id);
    }
  }

  async getDocumentDetails(documentId: string): Promise<DocumentDetails> {
    const document = await this.documents.findById(documentId);
    if (!document) throw new NotFoundError(`Document ${documentId} not found`);
    const links = await this.documents.listLinks(documentId);
    return { document, links };
  }
}
