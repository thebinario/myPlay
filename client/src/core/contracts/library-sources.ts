import type { LibrarySource, LibraryType, SourceStatus } from '@/core/domain/library-source';

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
  libraryType?: LibraryType;
}

/**
 * Capacidade nativa de escolher uma pasta do sistema operacional.
 *
 * Existe apenas no runtime desktop (Electron); no browser/Storybook não há
 * seletor injetado. Implementada pelo preload (`window.midoteca.pickDirectory`).
 */
export interface DirectoryPicker {
  /** Resolve com o caminho absoluto escolhido ou `null` se cancelado. */
  pickDirectory(): Promise<string | null>;
}

export type AddSourceResult =
  { ok: true; source: LibrarySource } | { ok: false; error: 'duplicate' | 'invalid' };

/** Persistência do agregado `LibrarySource` + verificação de disponibilidade. */
export interface LibrarySourcesRepository {
  list(): LibrarySource[];
  getById(id: string): LibrarySource | undefined;
  save(source: LibrarySource): void;
  rename(id: string, name: string): Promise<void>;
  /** Resolves when an optimistic source write has reached the runtime adapter. */
  waitForPersistence?(id: string): Promise<void>;
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
  waitForPersistence?(sourceId: string): Promise<void>;
  removeSource(id: string): void;
  renameSource(id: string, name: string): Promise<void>;
  reconnectSource(id: string): void;
  disconnectSource(id: string): void;
  checkSource(id: string): void;
  /** Presente apenas quando o runtime oferece seletor nativo de pasta. */
  pickDirectory?(): Promise<string | null>;
}
