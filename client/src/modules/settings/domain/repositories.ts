import type { AppPreferences } from '@/modules/settings/domain/preferences';

/** Contrato de persistência das preferências. */
export interface PreferencesRepository {
  get(): AppPreferences;
  save(preferences: AppPreferences): void;
  subscribe(listener: () => void): () => void;
}
