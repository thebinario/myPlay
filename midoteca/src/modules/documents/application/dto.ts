import type { Document, DocumentLink } from '../domain/entities';
import type { DocumentRepository } from '../domain/ports';

/** Shared dependency set for the document-association use cases. */
export interface DocumentAssociationDependencies {
  documents: DocumentRepository;
}

/** A document together with every link that points at it. */
export interface DocumentDetails {
  document: Document;
  links: DocumentLink[];
}
