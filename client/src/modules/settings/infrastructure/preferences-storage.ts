import type { AppPreferences } from '@/modules/settings/domain/preferences';

/** Porta de persistência das preferências. */
export interface PreferencesStorage {
  load(): Partial<AppPreferences> | null;
  save(preferences: AppPreferences): void;
}

const STORAGE_KEY = 'midoteca:preferences:v1';

export const localStoragePreferencesStorage: PreferencesStorage = {
  load() {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Partial<AppPreferences>) : null;
    } catch {
      return null;
    }
  },
  save(preferences) {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      /* ignore */
    }
  },
};

/** Adapter em memória — determinístico para testes. */
export function createInMemoryPreferencesStorage(): PreferencesStorage {
  let state: Partial<AppPreferences> | null = null;
  return {
    load: () => (state ? { ...state } : null),
    save: (preferences) => {
      state = { ...preferences };
    },
  };
}
