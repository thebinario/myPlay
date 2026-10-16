import type { DocumentAssociationDependencies } from '../dto';

/** Detaches every link of a document (keeps the document row and file). */
export class DetachAllDocuments {
  constructor(private readonly deps: DocumentAssociationDependencies) {}

  async execute(documentId: string): Promise<void> {
    const links = await this.deps.documents.listLinks(documentId);
    for (const link of links) {
      await this.deps.documents.deleteLink(link.id);
    }
  }
}
