import type { LibrarySource, SourceStatus } from '@/core/domain/library-source';

/**
 * Contrato de fronteira do runtime para gerenciamento de fontes.
 *
 * A implementação padrão é mockada (`MockLibrarySourcesRepository`); o adapter
 * real (IPC/Tauri) entra no lugar sem alterar consumidores.
 * Ver docs/ARCHITECTURE.md §7 e §13.
 */

export interface AddSourceInput {
  path: string;
  name?: string;
}

export type AddSourceResult =
  { ok: true; source: LibrarySource } | { ok: false; error: 'duplicate' | 'invalid' };

/** Persistência do agregado `LibrarySource` + verificação de disponibilidade. */
export interface LibrarySourcesRepository {
  list(): LibrarySource[];
  getById(id: string): LibrarySource | undefined;
  save(source: LibrarySource): void;
  remove(id: string): void;
  /** Verifica se a fonte continua acessível (IO). */
  probe(id: string): Promise<SourceStatus>;
  subscribe(listener: () => void): () => void;
}

/**
 * View-model consumido pela apresentação: dados reativos + ações.
 * Produzido por `useLibrarySources()`; passado como prop entre contextos para
 * que a `presentation/` de um contexto não importe a de outro.
 */
export interface SourcesViewModel {
  sources: LibrarySource[];
  addSource(input: AddSourceInput): AddSourceResult;
  removeSource(id: string): void;
  reconnectSource(id: string): void;
  disconnectSource(id: string): void;
  checkSource(id: string): void;
}
