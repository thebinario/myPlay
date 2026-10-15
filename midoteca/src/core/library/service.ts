import { ConflictError, NotFoundError, ValidationError } from '../shared/errors';
import type { EventBus } from '../indexing/events';
import type { SourceProbe } from '../indexing/ports';
import type { LibrarySource, LibrarySourceStatus } from './entities';
import type { LibraryRepository } from './repository';

export interface SourceAvailability {
  sourceId: string;
  rootPath: string;
  status: LibrarySourceStatus;
  exists: boolean;
  isDirectory: boolean;
  readable: boolean;
  volumeId: string | null;
}

export interface LibrarySourceServiceDependencies {
  library: LibraryRepository;
  probe: SourceProbe;
  events: EventBus;
}

/**
 * Manages the physical storage roots Midoteca indexes. Adding/updating a source
 * validates the path on disk; removal deletes only catalog rows.
 */
export class LibrarySourceService {
  constructor(private readonly deps: LibrarySourceServiceDependencies) {}

  async addSource(input: {
    rootPath: string;
    displayName?: string | null;
  }): Promise<LibrarySource> {
    const rootPath = normalizeRoot(input.rootPath);
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

  listSources(): Promise<LibrarySource[]> {
    return this.deps.library.listSources();
  }

  async getSource(id: string): Promise<LibrarySource> {
    const source = await this.deps.library.findSourceById(id);
    if (!source) throw new NotFoundError(`Library source ${id} not found`);
    return source;
  }

  async checkAvailability(id: string): Promise<SourceAvailability> {
    const source = await this.getSource(id);
    const inspection = await this.deps.probe.inspect(source.rootPath);
    const volumeId = inspection.exists
      ? await this.deps.probe.volumeId(source.rootPath)
      : source.volumeId;

    const available = inspection.exists && inspection.isDirectory && inspection.readable;
    let status: LibrarySourceStatus = source.status;
    if (!available && source.status !== 'offline') {
      status = 'offline';
      await this.deps.library.updateSourceStatus(id, { status });
      this.deps.events.emit('source:disconnected', {
        sourceId: id,
        rootPath: source.rootPath,
      });
    } else if (available && source.status === 'offline') {
      status = 'active';
      await this.deps.library.updateSourceStatus(id, { status });
      this.deps.events.emit('source:connected', {
        sourceId: id,
        rootPath: source.rootPath,
      });
    }

    return {
      sourceId: id,
      rootPath: source.rootPath,
      status,
      exists: inspection.exists,
      isDirectory: inspection.isDirectory,
      readable: inspection.readable,
      volumeId,
    };
  }

  async updateSourcePath(id: string, rootPath: string): Promise<LibrarySource> {
    const normalized = normalizeRoot(rootPath);
    await this.getSource(id);
    const inspection = await this.deps.probe.inspect(normalized);
    if (!inspection.exists || !inspection.isDirectory) {
      throw new ValidationError(`Invalid source path: ${normalized}`);
    }
    const duplicate = await this.deps.library.findSourceByRootPath(normalized);
    if (duplicate && duplicate.id !== id) {
      throw new ConflictError(`Source already registered: ${normalized}`);
    }
    const volumeId = await this.deps.probe.volumeId(normalized);
    const updated = await this.deps.library.updateSourcePath(id, {
      rootPath: normalized,
      volumeId,
    });
    if (!updated) throw new NotFoundError(`Library source ${id} not found`);
    this.deps.events.emit('source:connected', {
      sourceId: id,
      rootPath: updated.rootPath,
    });
    return updated;
  }

  async removeSource(id: string): Promise<void> {
    await this.getSource(id);
    await this.deps.library.deleteSource(id);
  }
}

function normalizeRoot(rootPath: string): string {
  if (typeof rootPath !== 'string' || rootPath.trim() === '') {
    throw new ValidationError('rootPath must be a non-empty string');
  }
  let value = rootPath.trim().replace(/\\/g, '/');
  if (value.length > 1 && value.endsWith('/')) {
    value = value.replace(/\/+$/, '');
  }
  return value;
}
