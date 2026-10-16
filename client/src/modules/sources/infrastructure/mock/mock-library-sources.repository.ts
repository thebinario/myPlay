import type { LibrarySource, SourceStatus } from '@/core/domain/library-source';
import type { LibrarySourcesRepository } from '@/core/contracts/library-sources';
import { SOURCES_SEED } from '@/modules/sources/infrastructure/seed/sources-seed';
import {
  createInMemorySourcesStorage,
  localStorageSourcesStorage,
  type SourcesStorage,
} from '@/modules/sources/infrastructure/sources-storage';

function clone(sources: LibrarySource[]): LibrarySource[] {
  return JSON.parse(JSON.stringify(sources)) as LibrarySource[];
}

/** Simula o tempo de resposta da verificação de disponibilidade. */
const probeDelayMs = 220;

/**
 * Adapter mockado e persistente de fontes. Mantém o histórico de conteúdos
 * mesmo quando uma fonte está desconectada e nunca remove arquivos físicos.
 */
export class MockLibrarySourcesRepository implements LibrarySourcesRepository {
  private sources: LibrarySource[];
  private listeners = new Set<() => void>();
  /** Fontes sinalizadas como offline (sobrevive ao estado transitório `checking`). */
  private offline = new Set<string>();

  constructor(private storage: SourcesStorage = localStorageSourcesStorage) {
    this.sources = clone(storage.load() ?? SOURCES_SEED);
    this.sources.forEach((source) => {
      if (source.status === 'disconnected') this.offline.add(source.id);
    });
  }

  private persist(): void {
    this.storage.save(this.sources);
  }

  private emit(): void {
    this.sources = [...this.sources];
    this.persist();
    this.listeners.forEach((listener) => listener());
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  list(): LibrarySource[] {
    return this.sources;
  }

  getById(id: string): LibrarySource | undefined {
    return this.sources.find((s) => s.id === id);
  }

  save(source: LibrarySource): void {
    if (source.status === 'disconnected') this.offline.add(source.id);
    else if (source.status === 'connected') this.offline.delete(source.id);
    const index = this.sources.findIndex((s) => s.id === source.id);
    if (index >= 0) {
      this.sources = [...this.sources.slice(0, index), source, ...this.sources.slice(index + 1)];
    } else {
      this.sources = [...this.sources, source];
    }
    this.emit();
  }

  async rename(id: string, name: string): Promise<void> {
    const source = this.getById(id);
    if (!source) throw new Error('Biblioteca não encontrada.');
    this.sources = this.sources.map((item) => (item.id === id ? { ...item, name } : item));
    this.emit();
  }

  remove(id: string): void {
    if (!this.sources.some((s) => s.id === id)) return;
    this.sources = this.sources.filter((s) => s.id !== id);
    this.offline.delete(id);
    this.emit();
  }

  async probe(id: string): Promise<SourceStatus> {
    const source = this.getById(id);
    if (!source) return 'unavailable';
    await new Promise((resolve) => setTimeout(resolve, probeDelayMs));
    return this.offline.has(id) ? 'disconnected' : 'connected';
  }

  /** Restaura o estado inicial (uso em testes e na restauração de exemplos). */
  reset(): void {
    this.sources = clone(SOURCES_SEED);
    this.offline = new Set(
      this.sources.filter((s) => s.status === 'disconnected').map((s) => s.id),
    );
    this.storage.clear();
    this.emit();
  }
}

export const mockLibrarySourcesRepository = new MockLibrarySourcesRepository();

/** Repositório em memória, isolado por teste. */
export function createInMemorySourcesRepository(
  seed: LibrarySource[] = SOURCES_SEED,
): MockLibrarySourcesRepository {
  return new MockLibrarySourcesRepository(createInMemorySourcesStorage(seed));
}
