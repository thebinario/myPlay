import {
  DEFAULT_PREFERENCES,
  normalizePreferences,
  type AppPreferences,
} from '@/modules/settings/domain/preferences';
import type { PreferencesRepository } from '@/modules/settings/domain/repositories';
import {
  createInMemoryPreferencesStorage,
  localStoragePreferencesStorage,
  type PreferencesStorage,
} from '@/modules/settings/infrastructure/preferences-storage';

/**
 * Adapter mockado e persistente de preferências. As preferências sobrevivem à
 * navegação e a recarregamentos, mantendo o mock consistente.
 */
export class MockPreferencesRepository implements PreferencesRepository {
  private preferences: AppPreferences;
  private listeners = new Set<() => void>();

  constructor(private storage: PreferencesStorage = localStoragePreferencesStorage) {
    this.preferences = normalizePreferences(storage.load());
  }

  get(): AppPreferences {
    return this.preferences;
  }

  save(preferences: AppPreferences): void {
    this.preferences = { ...preferences };
    this.storage.save(this.preferences);
    this.listeners.forEach((listener) => listener());
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  reset(): void {
    this.save({ ...DEFAULT_PREFERENCES });
  }
}

export const mockPreferencesRepository = new MockPreferencesRepository();

export function createInMemoryPreferencesRepository(): MockPreferencesRepository {
  return new MockPreferencesRepository(createInMemoryPreferencesStorage());
}
