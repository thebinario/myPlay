import React from 'react';
import type { AppPreferences } from '@/modules/settings/domain/preferences';
import {
  SelectField,
  SettingsRow,
} from '@/modules/settings/presentation/components/SettingsControls';

export interface AppearanceSettingsProps {
  preferences: AppPreferences;
  onChange: <K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) => void;
}

export const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({
  preferences,
  onChange,
}) => (
  <section aria-labelledby="settings-appearance" style={{ display: 'grid', gap: '18px' }}>
    <h2 id="settings-appearance" style={{ color: '#F0F4FC', fontSize: '16px', margin: 0 }}>
      Aparência
    </h2>
    <SettingsRow label="Tema" description="O tema escuro é o padrão do aplicativo.">
      <SelectField
        label="Tema"
        value={preferences.theme}
        options={[
          { id: 'dark', label: 'Escuro' },
          { id: 'light', label: 'Claro (em breve)' },
          { id: 'system', label: 'Seguir sistema (em breve)' },
        ]}
        onChange={(value) => onChange('theme', value as AppPreferences['theme'])}
      />
    </SettingsRow>
    <SettingsRow label="Idioma da interface">
      <SelectField
        label="Idioma da interface"
        value={preferences.interfaceLanguage}
        options={[
          { id: 'pt-BR', label: 'Português (Brasil)' },
          { id: 'en', label: 'English (em breve)' },
        ]}
        onChange={(value) =>
          onChange('interfaceLanguage', value as AppPreferences['interfaceLanguage'])
        }
      />
    </SettingsRow>
    <p style={{ color: '#64748B', fontSize: '12px', margin: 0 }}>
      Tema e idioma são preparados para personalizações futuras; nesta versão a interface permanece
      escura e em português.
    </p>
  </section>
);

AppearanceSettings.displayName = 'AppearanceSettings';
