import type { LibrarySource } from '@/core/domain/library-source';

/** Porta de persistência das fontes. O adapter decide o mecanismo. */
export interface SourcesStorage {
  load(): LibrarySource[] | null;
  save(sources: LibrarySource[]): void;
  clear(): void;
}

const STORAGE_KEY = 'midoteca:sources:v1';

function clone(sources: LibrarySource[]): LibrarySource[] {
  return JSON.parse(JSON.stringify(sources)) as LibrarySource[];
}

/** Adapter sobre `localStorage` (sobrevive a recarregamentos no browser). */
export const localStorageSourcesStorage: SourcesStorage = {
  load() {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as LibrarySource[];
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  },
  save(sources) {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sources));
    } catch {
      /* quota cheia ou modo restrito — ignora */
    }
  },
  clear() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  },
};

/** Adapter em memória — determinístico para testes. */
export function createInMemorySourcesStorage(seed?: LibrarySource[]): SourcesStorage {
  let state: LibrarySource[] | null = seed ? clone(seed) : null;
  return {
    load: () => (state ? clone(state) : null),
    save: (next) => {
      state = clone(next);
    },
    clear: () => {
      state = null;
    },
  };
}
