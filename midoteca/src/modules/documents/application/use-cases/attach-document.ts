import type { CreateDocumentLink } from '../../domain/inputs';
import type { DocumentLink } from '../../domain/entities';
import type { DocumentAssociationDependencies } from '../dto';

/**
 * Attaches a document to a course, module and/or lesson. Idempotent: re-attaching
 * the same target returns the existing link. Never touches the physical file.
 */
export class AttachDocument {
  constructor(private readonly deps: DocumentAssociationDependencies) {}

  execute(input: CreateDocumentLink): Promise<DocumentLink> {
    return this.deps.documents.createLink(input);
  }
}
