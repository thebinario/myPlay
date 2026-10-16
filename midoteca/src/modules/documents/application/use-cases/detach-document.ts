import type { DocumentAssociationDependencies } from '../dto';

/** Detaches a link by id. The document and its file remain untouched. */
export class DetachDocument {
  constructor(private readonly deps: DocumentAssociationDependencies) {}

  execute(linkId: string): Promise<void> {
    return this.deps.documents.deleteLink(linkId);
  }
}
