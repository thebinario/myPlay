import React from 'react';
import {
  AUDIO_LANGUAGES,
  SPEED_OPTIONS,
  SUBTITLE_LANGUAGES,
  type AppPreferences,
} from '@/modules/settings/domain/preferences';
import {
  SelectField,
  SettingsRow,
  ToggleField,
} from '@/modules/settings/presentation/components/SettingsControls';

export interface PlaybackSettingsProps {
  preferences: AppPreferences;
  onChange: <K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) => void;
}

export const PlaybackSettings: React.FC<PlaybackSettingsProps> = ({ preferences, onChange }) => (
  <section aria-labelledby="settings-playback" style={{ display: 'grid', gap: '18px' }}>
    <h2 id="settings-playback" style={{ color: '#F0F4FC', fontSize: '16px', margin: 0 }}>
      Reprodução
    </h2>
    <SettingsRow label="Velocidade padrão">
      <SelectField
        label="Velocidade padrão"
        value={preferences.playbackSpeed}
        options={SPEED_OPTIONS.map((speed) => ({ id: speed, label: `${speed}×` }))}
        onChange={(value) => onChange('playbackSpeed', value)}
      />
    </SettingsRow>
    <SettingsRow label="Idioma de áudio preferido">
      <SelectField
        label="Idioma de áudio preferido"
        value={preferences.preferredAudioLanguage}
        options={AUDIO_LANGUAGES.map((language) => ({ ...language }))}
        onChange={(value) => onChange('preferredAudioLanguage', value)}
      />
    </SettingsRow>
    <SettingsRow label="Legendas preferidas">
      <SelectField
        label="Legendas preferidas"
        value={preferences.preferredSubtitleLanguage}
        options={SUBTITLE_LANGUAGES.map((language) => ({ ...language }))}
        onChange={(value) => onChange('preferredSubtitleLanguage', value)}
      />
    </SettingsRow>
    <SettingsRow label="Retomar de onde parei" description="Continua a aula na última posição.">
      <ToggleField
        label="Retomar de onde parei"
        checked={preferences.resumeAutomatically}
        onChange={(value) => onChange('resumeAutomatically', value)}
      />
    </SettingsRow>
    <SettingsRow label="Reproduzir próxima aula" description="Avança automaticamente ao terminar.">
      <ToggleField
        label="Reproduzir próxima aula"
        checked={preferences.autoPlayNextLesson}
        onChange={(value) => onChange('autoPlayNextLesson', value)}
      />
    </SettingsRow>
  </section>
);

PlaybackSettings.displayName = 'PlaybackSettings';
