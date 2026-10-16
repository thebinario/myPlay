import { NotFoundError } from '../../../core/errors';
import type { Document } from '../domain/entities';
import type { DocumentAssociationDependencies, DocumentDetails } from './dto';

/** Read side for document associations. */
export class DocumentQueries {
  constructor(private readonly deps: DocumentAssociationDependencies) {}

  listByCourse(courseId: string): Promise<Document[]> {
    return this.deps.documents.listByCourse(courseId);
  }

  listByModule(moduleId: string): Promise<Document[]> {
    return this.deps.documents.listByModule(moduleId);
  }

  listByLesson(lessonId: string): Promise<Document[]> {
    return this.deps.documents.listByLesson(lessonId);
  }

  async getDetails(documentId: string): Promise<DocumentDetails> {
    const document = await this.deps.documents.findById(documentId);
    if (!document) throw new NotFoundError(`Document ${documentId} not found`);
    const links = await this.deps.documents.listLinks(documentId);
    return { document, links };
  }
}
