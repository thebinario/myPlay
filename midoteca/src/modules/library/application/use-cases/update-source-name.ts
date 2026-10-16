import { NotFoundError, ValidationError } from '../../../../core/errors';
import type { LibrarySource } from '../../domain/entities';
import type { LibraryRepository } from '../../domain/repositories';

export interface UpdateSourceNameInput {
  sourceId: string;
  displayName: string;
}

interface UpdateSourceNameDependencies {
  library: Pick<LibraryRepository, 'updateSourceName'>;
}

export class UpdateSourceName {
  constructor(private readonly deps: UpdateSourceNameDependencies) {}

  async execute(input: UpdateSourceNameInput): Promise<LibrarySource> {
    if (typeof input.displayName !== 'string' || input.displayName.trim() === '') {
      throw new ValidationError('Field "displayName" must be a non-empty string');
    }
    const updated = await this.deps.library.updateSourceName(input.sourceId, {
      displayName: input.displayName.trim(),
    });
    if (!updated) throw new NotFoundError(`Library source ${input.sourceId} not found`);
    return updated;
  }
}
