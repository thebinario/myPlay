import {
  updatePreference as applyPreference,
  type AppPreferences,
} from '@/modules/settings/domain/preferences';
import type { PreferencesRepository } from '@/modules/settings/domain/repositories';

/** Atualiza uma preferência e persiste o novo estado. */
export function updatePreference<K extends keyof AppPreferences>(
  repository: PreferencesRepository,
  key: K,
  value: AppPreferences[K],
): void {
  repository.save(applyPreference(repository.get(), key, value));
}
