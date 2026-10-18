import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import type { Course, Document, LibraryItem, Movie } from '@/core/domain/library';
import type { Collection } from '@/core/domain/collection';
import { mockLibraryService } from '@/modules/library/infrastructure/mock-library-repository';
import type { LibraryRepository } from '@/core/ports/libraryRepository';

const LibraryContext = createContext<LibraryRepository | null>(null);

interface LibraryProviderProps {
  /** Permite injetar uma implementação (ex.: fake em testes / repositório real). */
  repository?: LibraryRepository;
  children: ReactNode;
}

export function LibraryProvider({ repository, children }: LibraryProviderProps) {
  const value = repository ?? mockLibraryService;
  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

/**
 * Acessa o repositório da biblioteca. Sem `LibraryProvider` assume a
 * implementação padrão em memória (mantém Storybook e testes unitários simples).
 */
export function useLibraryRepository(): LibraryRepository {
  return useContext(LibraryContext) ?? mockLibraryService;
}

/** Catálogo reativo: re-renderiza quando cursos/documentos/filmes mudam. */
export function useLibraryItems(): LibraryItem[] {
  const repository = useLibraryRepository();
  const subscribe = useCallback(
    (listener: () => void) => repository.subscribe(listener),
    [repository],
  );
  const getSnapshot = useCallback(() => repository.getItems(), [repository]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Coleções agregadas fornecidas pelo núcleo (read model reativo). */
export function useLibraryCollections(): Collection[] {
  const repository = useLibraryRepository();
  const subscribe = useCallback(
    (listener: () => void) => repository.subscribe(listener),
    [repository],
  );
  const getSnapshot = useCallback(() => repository.getCollections(), [repository]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export interface UseLibraryResult {
  repository: LibraryRepository;
  items: LibraryItem[];
  collections: Collection[];
  courses: Course[];
  movies: Movie[];
  documents: Document[];
}

/** Fonte única de verdade do catálogo + acesso ao repositório. */
export function useLibrary(): UseLibraryResult {
  const repository = useLibraryRepository();
  const items = useLibraryItems();
  const collections = useLibraryCollections();
  return useMemo(
    () => ({
      repository,
      items,
      collections,
      courses: items.filter((i): i is Course => i.type === 'course'),
      movies: items.filter((i): i is Movie => i.type === 'movie'),
      documents: items.filter((i): i is Document => i.type === 'document'),
    }),
    [repository, items, collections],
  );
}
