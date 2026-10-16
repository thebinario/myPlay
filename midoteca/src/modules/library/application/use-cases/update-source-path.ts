import { ConflictError, NotFoundError, ValidationError } from '../../../../core/errors';
import type { EventBus } from '../../../indexing/domain/events';
import type { SourceProbe } from '../../../indexing/domain/ports';
import type { LibrarySource } from '../../domain/entities';
import type { LibraryRepository } from '../../domain/ports';
import type { UpdateSourcePathInput } from '../dto';
import { normalizeRootPath } from '../normalize-root-path';

export interface UpdateSourcePathDependencies {
  library: LibraryRepository;
  probe: SourceProbe;
  events: EventBus;
}

/** Points an existing source at a new, validated root path. */
export class UpdateSourcePath {
  constructor(private readonly deps: UpdateSourcePathDependencies) {}

  async execute(input: UpdateSourcePathInput): Promise<LibrarySource> {
    const normalized = normalizeRootPath(input.rootPath);
    const existing = await this.deps.library.findSourceById(input.sourceId);
    if (!existing) throw new NotFoundError(`Library source ${input.sourceId} not found`);

    const inspection = await this.deps.probe.inspect(normalized);
    if (!inspection.exists || !inspection.isDirectory) {
      throw new ValidationError(`Invalid source path: ${normalized}`);
    }
    const duplicate = await this.deps.library.findSourceByRootPath(normalized);
    if (duplicate && duplicate.id !== input.sourceId) {
      throw new ConflictError(`Source already registered: ${normalized}`);
    }
    const volumeId = await this.deps.probe.volumeId(normalized);
    const updated = await this.deps.library.updateSourcePath(input.sourceId, {
      rootPath: normalized,
      volumeId,
    });
    if (!updated) throw new NotFoundError(`Library source ${input.sourceId} not found`);
    this.deps.events.emit('source:connected', {
      sourceId: input.sourceId,
      rootPath: updated.rootPath,
    });
    return updated;
  }
}
