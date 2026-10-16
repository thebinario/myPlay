import { NotFoundError } from '../../../../core/errors';
import type { EventBus } from '../../../indexing/domain/events';
import type { SourceProbe } from '../../../indexing/domain/ports';
import type { LibrarySource } from '../../domain/entities';
import type { LibraryRepository } from '../../domain/repositories';
import { AddSource, type AddSourceInput } from '../use-cases/add-source';
import {
  CheckSourceAvailability,
  type SourceAvailability,
} from '../use-cases/check-source-availability';
import { RemoveSource } from '../use-cases/remove-source';
import { UpdateSourcePath } from '../use-cases/update-source-path';
import { UpdateSourceName } from '../use-cases/update-source-name';

export interface LibrarySourceServiceDependencies {
  library: LibraryRepository;
  probe: SourceProbe;
  events: EventBus;
}

/**
 * Facade over the library-source use cases. It holds no business rules of its
 * own: each command is an explicit use case under `application/use-cases/`, and
 * this class only preserves the stable `Midoteca.sources` surface.
 */
export class LibrarySourceService {
  private readonly addSourceUseCase: AddSource;
  private readonly updateSourcePathUseCase: UpdateSourcePath;
  private readonly updateSourceNameUseCase: UpdateSourceName;
  private readonly checkAvailabilityUseCase: CheckSourceAvailability;
  private readonly removeSourceUseCase: RemoveSource;

  constructor(private readonly deps: LibrarySourceServiceDependencies) {
    this.addSourceUseCase = new AddSource(deps);
    this.updateSourcePathUseCase = new UpdateSourcePath(deps);
    this.updateSourceNameUseCase = new UpdateSourceName(deps);
    this.checkAvailabilityUseCase = new CheckSourceAvailability(deps);
    this.removeSourceUseCase = new RemoveSource({ library: deps.library });
  }

  addSource(input: AddSourceInput): Promise<LibrarySource> {
    return this.addSourceUseCase.execute(input);
  }

  listSources(): Promise<LibrarySource[]> {
    return this.deps.library.listSources();
  }

  async getSource(id: string): Promise<LibrarySource> {
    const source = await this.deps.library.findSourceById(id);
    if (!source) throw new NotFoundError(`Library source ${id} not found`);
    return source;
  }

  checkAvailability(id: string): Promise<SourceAvailability> {
    return this.checkAvailabilityUseCase.execute(id);
  }

  updateSourcePath(id: string, rootPath: string): Promise<LibrarySource> {
    return this.updateSourcePathUseCase.execute({ sourceId: id, rootPath });
  }

  updateSourceName(id: string, displayName: string): Promise<LibrarySource> {
    return this.updateSourceNameUseCase.execute({ sourceId: id, displayName });
  }

  removeSource(id: string): Promise<void> {
    return this.removeSourceUseCase.execute(id);
  }
}
