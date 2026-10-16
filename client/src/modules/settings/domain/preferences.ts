/** Preferências do aplicativo. Regras puras, sem IO. */

export type ThemePreference = 'dark' | 'light' | 'system';
export type InterfaceLanguage = 'pt-BR' | 'en';

export interface AppPreferences {
  // Reprodução
  playbackSpeed: string;
  preferredAudioLanguage: string;
  preferredSubtitleLanguage: string;
  resumeAutomatically: boolean;
  autoPlayNextLesson: boolean;
  // Aparência
  theme: ThemePreference;
  interfaceLanguage: InterfaceLanguage;
  // Processamento
  allowBackgroundProcessing: boolean;
  pauseTasksDuringPlayback: boolean;
  prioritizeLowResource: boolean;
}

export const SPEED_OPTIONS = ['0.75', '1', '1.25', '1.5', '2'] as const;
export const AUDIO_LANGUAGES = [
  { id: 'pt-BR', label: 'Português (Brasil)' },
  { id: 'en', label: 'Inglês' },
  { id: 'es', label: 'Espanhol' },
] as const;
export const SUBTITLE_LANGUAGES = [
  { id: 'off', label: 'Desativadas' },
  { id: 'pt-BR', label: 'Português (Brasil)' },
  { id: 'en', label: 'Inglês' },
] as const;

export const DEFAULT_PREFERENCES: AppPreferences = {
  playbackSpeed: '1',
  preferredAudioLanguage: 'pt-BR',
  preferredSubtitleLanguage: 'pt-BR',
  resumeAutomatically: true,
  autoPlayNextLesson: false,
  theme: 'dark',
  interfaceLanguage: 'pt-BR',
  allowBackgroundProcessing: true,
  pauseTasksDuringPlayback: true,
  prioritizeLowResource: false,
};

export function updatePreference<K extends keyof AppPreferences>(
  preferences: AppPreferences,
  key: K,
  value: AppPreferences[K],
): AppPreferences {
  return { ...preferences, [key]: value };
}

/** Mescla preferências desconhecidas com os padrões (tolerante a schema antigo). */
export function normalizePreferences(value: Partial<AppPreferences> | null): AppPreferences {
  return { ...DEFAULT_PREFERENCES, ...(value ?? {}) };
}
