import { NotFoundError } from '../../../../core/errors';
import type { EventBus } from '../../../indexing/domain/events';
import type { SourceProbe } from '../../../indexing/domain/ports';
import type { LibrarySourceStatus } from '../../domain/entities';
import type { LibraryRepository } from '../../domain/repositories';

/** Output of `CheckSourceAvailability`. */
export interface SourceAvailability {
  sourceId: string;
  rootPath: string;
  status: LibrarySourceStatus;
  exists: boolean;
  isDirectory: boolean;
  readable: boolean;
  volumeId: string | null;
}

export interface CheckSourceAvailabilityDependencies {
  library: LibraryRepository;
  probe: SourceProbe;
  events: EventBus;
}

/**
 * Probes the source root on disk and reconciles its catalog status: an
 * unreachable volume flips the source to `offline`, a recovered one back to
 * `active` — emitting the matching lifecycle event.
 */
export class CheckSourceAvailability {
  constructor(private readonly deps: CheckSourceAvailabilityDependencies) {}

  async execute(sourceId: string): Promise<SourceAvailability> {
    const source = await this.deps.library.findSourceById(sourceId);
    if (!source) throw new NotFoundError(`Library source ${sourceId} not found`);

    const inspection = await this.deps.probe.inspect(source.rootPath);
    const volumeId = inspection.exists
      ? await this.deps.probe.volumeId(source.rootPath)
      : source.volumeId;

    const available = inspection.exists && inspection.isDirectory && inspection.readable;
    let status: LibrarySourceStatus = source.status;
    if (!available && source.status !== 'offline') {
      status = 'offline';
      await this.deps.library.updateSourceStatus(sourceId, { status });
      this.deps.events.emit('source:disconnected', {
        sourceId,
        rootPath: source.rootPath,
      });
    } else if (available && source.status === 'offline') {
      status = 'active';
      await this.deps.library.updateSourceStatus(sourceId, { status });
      this.deps.events.emit('source:connected', {
        sourceId,
        rootPath: source.rootPath,
      });
    }

    return {
      sourceId,
      rootPath: source.rootPath,
      status,
      exists: inspection.exists,
      isDirectory: inspection.isDirectory,
      readable: inspection.readable,
      volumeId,
    };
  }
}
