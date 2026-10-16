import type { AppPreferences } from '@/modules/settings/domain/preferences';
import type { PreferencesRepository } from '@/modules/settings/domain/repositories';

export function getPreferences(repository: PreferencesRepository): AppPreferences {
  return repository.get();
}
