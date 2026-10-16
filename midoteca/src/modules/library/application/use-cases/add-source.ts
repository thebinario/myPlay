import { ConflictError, NotFoundError, ValidationError } from '../../../../core/errors';
import type { EventBus } from '../../../indexing/domain/events';
import type { SourceProbe } from '../../../indexing/domain/ports';
import type { LibrarySource } from '../../domain/entities';
import type { LibraryRepository } from '../../domain/repositories';
import { normalizeRootPath } from '../normalize-root-path';

/** Input of `AddSource`. */
export interface AddSourceInput {
  rootPath: string;
  displayName?: string | null;
}

export interface AddSourceDependencies {
  library: LibraryRepository;
  probe: SourceProbe;
  events: EventBus;
}

/**
 * Registers a new physical storage root. Validates the path on disk and refuses
 * duplicates; only catalog rows are written (no filesystem mutation).
 */
export class AddSource {
  constructor(private readonly deps: AddSourceDependencies) {}

  async execute(input: AddSourceInput): Promise<LibrarySource> {
    const rootPath = normalizeRootPath(input.rootPath);
    const inspection = await this.deps.probe.inspect(rootPath);
    if (!inspection.exists) {
      throw new NotFoundError(`Path does not exist: ${rootPath}`);
    }
    if (!inspection.isDirectory) {
      throw new ValidationError(`Path is not a directory: ${rootPath}`);
    }
    if (!inspection.readable) {
      throw new ValidationError(`Path is not readable: ${rootPath}`);
    }

    const duplicate = await this.deps.library.findSourceByRootPath(rootPath);
    if (duplicate) {
      throw new ConflictError(`Source already registered: ${rootPath}`);
    }

    const displayName =
      input.displayName && input.displayName.trim() !== '' ? input.displayName.trim() : null;
    const volumeId = await this.deps.probe.volumeId(rootPath);

    const source = await this.deps.library.createSource({
      rootPath,
      displayName,
      volumeId,
      status: 'active',
    });
    this.deps.events.emit('source:added', {
      sourceId: source.id,
      rootPath: source.rootPath,
      displayName: source.displayName,
    });
    return source;
  }
}
