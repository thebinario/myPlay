import { useCallback, useMemo, useSyncExternalStore } from 'react';
import type { AppPreferences } from '@/modules/settings/domain/preferences';
import { updatePreference } from '@/modules/settings/application/use-cases/update-preference';
import { useSettingsRepository } from '@/modules/settings/presentation/providers/SettingsProvider';

export interface UseSettingsResult {
  preferences: AppPreferences;
  setPreference: <K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) => void;
}

/** Fonte única de verdade das preferências + setter tipado. */
export function useSettings(): UseSettingsResult {
  const repository = useSettingsRepository();

  const subscribe = useCallback(
    (listener: () => void) => repository.subscribe(listener),
    [repository],
  );
  const getSnapshot = useCallback(() => repository.get(), [repository]);
  const preferences = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setPreference = useCallback(
    <K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) => {
      updatePreference(repository, key, value);
    },
    [repository],
  );

  return useMemo(() => ({ preferences, setPreference }), [preferences, setPreference]);
}
