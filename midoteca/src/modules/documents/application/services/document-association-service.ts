import type { Document, DocumentLink } from '../../domain/entities';
import type { CreateDocumentLink } from '../../domain/inputs';
import type { DocumentAssociationDependencies, DocumentDetails } from '../dto';
import { DocumentQueries } from '../queries';
import { AttachDocument } from '../use-cases/attach-document';
import { DetachAllDocuments } from '../use-cases/detach-all-documents';
import { DetachDocument } from '../use-cases/detach-document';

/**
 * Facade over the document-association use cases. A PDF may be attached to a
 * course, module and/or lesson; detaching never deletes the physical file nor
 * the document row. All invariants that span reads + writes live here, while
 * atomic persistence stays in the repository adapter; the individual operations
 * are explicit use cases under `application/use-cases/`.
 */
export class DocumentAssociationService {
  private readonly attachDocumentUseCase: AttachDocument;
  private readonly detachDocumentUseCase: DetachDocument;
  private readonly detachAllDocumentsUseCase: DetachAllDocuments;
  private readonly queries: DocumentQueries;

  constructor(deps: DocumentAssociationDependencies) {
    this.attachDocumentUseCase = new AttachDocument(deps);
    this.detachDocumentUseCase = new DetachDocument(deps);
    this.detachAllDocumentsUseCase = new DetachAllDocuments(deps);
    this.queries = new DocumentQueries(deps);
  }

  listCourseDocuments(courseId: string): Promise<Document[]> {
    return this.queries.listByCourse(courseId);
  }

  listModuleDocuments(moduleId: string): Promise<Document[]> {
    return this.queries.listByModule(moduleId);
  }

  listLessonDocuments(lessonId: string): Promise<Document[]> {
    return this.queries.listByLesson(lessonId);
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
    return this.attachDocumentUseCase.execute(input);
  }

  /** Detaches a link by id. The document and its file remain untouched. */
  detach(linkId: string): Promise<void> {
    return this.detachDocumentUseCase.execute(linkId);
  }

  /** Detaches every link of a document (keeps the document row and file). */
  detachAll(documentId: string): Promise<void> {
    return this.detachAllDocumentsUseCase.execute(documentId);
  }

  getDocumentDetails(documentId: string): Promise<DocumentDetails> {
    return this.queries.getDetails(documentId);
  }
}
