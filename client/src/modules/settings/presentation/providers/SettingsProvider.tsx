import { createContext, useContext, type ReactNode } from 'react';
import { mockPreferencesRepository } from '@/modules/settings/infrastructure/mock-preferences.repository';
import type { PreferencesRepository } from '@/modules/settings/domain/repositories';

const SettingsContext = createContext<PreferencesRepository>(mockPreferencesRepository);

interface SettingsProviderProps {
  repository?: PreferencesRepository;
  children: ReactNode;
}

/** Seam de DI local do contexto `settings`. Sem provider, usa o adapter mockado padrão. */
export function SettingsProvider({ repository, children }: SettingsProviderProps) {
  return (
    <SettingsContext.Provider value={repository ?? mockPreferencesRepository}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettingsRepository(): PreferencesRepository {
  return useContext(SettingsContext);
}
