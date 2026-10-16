import type { MidotecaBridge } from '@/core/contracts/desktop-bridge';
import type { LibrarySourcesRepository } from '@/core/contracts/library-sources';
import type { LibrarySource, SourceStatus } from '@/core/domain/library-source';
import { mapCoreSource, mapCoreStatus } from '@/modules/sources/infrastructure/ipc/map-library-source';

/** Real repository via Electron IPC/SQLite with a synchronous UI snapshot. */
export class IpcLibrarySourcesRepository implements LibrarySourcesRepository {
  private cache: LibrarySource[] = [];
  private readonly listeners = new Set<() => void>();
  private refreshing: Promise<void> | null = null;
  private detachEvents: (() => void) | null = null;
  private readonly pendingWrites = new Map<string, Promise<void>>();
  private readonly persistedIds = new Map<string, string>();

  constructor(private readonly bridge: MidotecaBridge) {}

  /** Loads the initial snapshot and starts listening to kernel events. */
  async hydrate(): Promise<void> {
    if (!this.detachEvents) {
      this.detachEvents = this.bridge.onEvent((event) => {
        if (event.name.startsWith('source:') || event.name.startsWith('index:')) {
          void this.refresh();
        }
      });
    }
    await this.refresh();
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }

  private async refresh(): Promise<void> {
    if (this.refreshing) return this.refreshing;
    this.refreshing = (async () => {
      const sources = await this.bridge.invoke('sources.list');
      const mapped = await Promise.all(
        sources.map(async (source) => {
          const state = await this.bridge.invoke('indexing.status', { sourceId: source.id });
          return mapCoreSource(source, state?.mediaCount ?? 0);
        }),
      );
      this.cache = mapped;
      this.emit();
    })();
    try {
      await this.refreshing;
    } finally {
      this.refreshing = null;
    }
  }

  list(): LibrarySource[] {
    return this.cache;
  }

  getById(id: string): LibrarySource | undefined {
    return this.cache.find((source) => source.id === id);
  }

  save(source: LibrarySource): void {
    const existing = this.getById(source.id);
    if (existing) {
      this.cache = this.cache.map((item) => (item.id === source.id ? source : item));
      this.emit();
      return;
    }
    this.cache = [...this.cache, source];
    this.emit();
    const pending = this.bridge
      .invoke('sources.add', {
        rootPath: source.path,
        displayName: source.name,
        libraryType: source.libraryType ?? 'course',
      })
      .then((created) => {
        const persisted = mapCoreSource(created, source.itemCount);
        this.persistedIds.set(source.id, persisted.id);
        this.cache = [
          ...this.cache.filter(
            (item) => item.id !== source.id && item.id !== persisted.id,
          ),
          persisted,
        ];
        this.emit();
      })
      .catch((cause: unknown) => {
        console.error('[sources] falha ao adicionar fonte no kernel', cause);
        return this.refresh().then(() => {
          throw cause;
        });
      });
    this.pendingWrites.set(source.id, pending);
    void pending.finally(() => this.pendingWrites.delete(source.id)).catch(() => undefined);
  }

  async waitForPersistence(id: string): Promise<void> {
    const pending = this.pendingWrites.get(id);
    await pending;
    const persistedId = this.persistedIds.get(id);
    const found = persistedId !== undefined && this.cache.some(({ id: sourceId }) => sourceId === persistedId);
    if (!found) throw new Error('A biblioteca não foi confirmada pelo núcleo.');
  }

  async rename(id: string, name: string): Promise<void> {
    const existing = this.getById(id);
    if (!existing) throw new Error('Biblioteca não encontrada.');
    this.cache = this.cache.map((source) =>
      source.id === id ? { ...source, name } : source,
    );
    this.emit();
    try {
      const updated = await this.bridge.invoke('sources.rename', { sourceId: id, displayName: name });
      this.cache = this.cache.map((source) =>
        source.id === id ? mapCoreSource(updated, existing.itemCount) : source,
      );
      this.emit();
    } catch (cause) {
      await this.refresh();
      throw cause;
    }
  }

  remove(id: string): void {
    if (!this.cache.some((source) => source.id === id)) return;
    this.cache = this.cache.filter((source) => source.id !== id);
    this.emit();
    void this.bridge
      .invoke('sources.remove', { sourceId: id })
      .then(() => this.refresh())
      .catch((cause: unknown) => {
        console.error('[sources] falha ao remover fonte no kernel', cause);
        void this.refresh();
      });
  }

  async probe(id: string): Promise<SourceStatus> {
    const source = await this.bridge.invoke('sources.check', { sourceId: id });
    return mapCoreStatus(source.status);
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Stops listening to kernel events (used on teardown/tests). */
  dispose(): void {
    this.detachEvents?.();
    this.detachEvents = null;
  }
}
