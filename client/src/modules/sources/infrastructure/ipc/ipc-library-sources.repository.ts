import type { MidotecaBridge } from '@/core/contracts/desktop-bridge';
import type { LibrarySourcesRepository } from '@/core/contracts/library-sources';
import type { LibrarySource, SourceStatus } from '@/core/domain/library-source';
import {
  mapCoreSource,
  mapCoreStatus,
} from '@/modules/sources/infrastructure/ipc/map-library-source';

/**
 * Real `LibrarySourcesRepository` backed by the desktop bridge (Electron IPC →
 * `@midoteca/core` + SQLite).
 *
 * The port is synchronous by design (`useSyncExternalStore` reads `list()`
 * during render), so this adapter keeps an in-memory snapshot that is hydrated
 * asynchronously from the kernel and invalidated by core events. Writes are
 * optimistic: the UI updates immediately, then a refresh reconciles the snapshot
 * with the authoritative kernel state.
 */
export class IpcLibrarySourcesRepository implements LibrarySourcesRepository {
  private cache: LibrarySource[] = [];
  private readonly listeners = new Set<() => void>();
  private refreshing: Promise<void> | null = null;
  private detachEvents: (() => void) | null = null;

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
    void this.bridge
      .invoke('sources.add', { rootPath: source.path, displayName: source.name })
      .then(() => this.refresh())
      .catch((cause: unknown) => {
        console.error('[sources] falha ao adicionar fonte no kernel', cause);
        void this.refresh();
      });
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
