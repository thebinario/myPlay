import { NotFoundError } from '../../../../core/errors';
import type { LibraryRepository } from '../../domain/repositories';

export interface RemoveSourceDependencies {
  library: LibraryRepository;
}

/** Removes a source's catalog rows only; physical files are never touched. */
export class RemoveSource {
  constructor(private readonly deps: RemoveSourceDependencies) {}

  async execute(sourceId: string): Promise<void> {
    const source = await this.deps.library.findSourceById(sourceId);
    if (!source) throw new NotFoundError(`Library source ${sourceId} not found`);
    await this.deps.library.deleteSource(sourceId);
  }
}
