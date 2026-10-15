import type { LibraryItem, PdfReadingState } from '../types/library';

/** Estado serializável da biblioteca (catálogo + estados auxiliares). */
export interface PersistedLibraryState {
  version: number;
  items: LibraryItem[];
  playbackPositions: [string, number][];
  subtitlePreferences: [string, string | null][];
  readingStates: [string, PdfReadingState][];
}

/**
 * Porta de persistência do repositório. O adapter concreto decide o mecanismo
 * (localStorage, SQLite, arquivo). O domínio/serviço não conhece o mecanismo.
 */
export interface LibraryStorage {
  load(): PersistedLibraryState | null;
  save(state: PersistedLibraryState): void;
  clear(): void;
}

export const STORAGE_VERSION = 1;
const STORAGE_KEY = 'midoteca:library:v1';

/** Adapter concreto sobre `localStorage` (sobrevive a recarregamentos no browser). */
export const localStorageLibraryStorage: LibraryStorage = {
  load() {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as PersistedLibraryState;
      return parsed?.version === STORAGE_VERSION ? parsed : null;
    } catch {
      return null;
    }
  },
  save(state) {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
export function createInMemoryLibraryStorage(): LibraryStorage {
  let state: PersistedLibraryState | null = null;
  return {
    load: () => (state ? (JSON.parse(JSON.stringify(state)) as PersistedLibraryState) : null),
    save: (next) => {
      state = JSON.parse(JSON.stringify(next)) as PersistedLibraryState;
    },
    clear: () => {
      state = null;
    },
  };
}
