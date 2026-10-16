import React from 'react';
import type { AppPreferences } from '@/modules/settings/domain/preferences';
import {
  SettingsRow,
  ToggleField,
} from '@/modules/settings/presentation/components/SettingsControls';

export interface ProcessingSettingsProps {
  preferences: AppPreferences;
  onChange: <K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) => void;
  showDevelopmentNote?: boolean;
}

export const ProcessingSettings: React.FC<ProcessingSettingsProps> = ({
  preferences,
  onChange,
  showDevelopmentNote = true,
}) => (
  <section aria-labelledby="settings-processing" style={{ display: 'grid', gap: '18px' }}>
    <h2 id="settings-processing" style={{ color: '#F0F4FC', fontSize: '16px', margin: 0 }}>
      Processamento
    </h2>
    <SettingsRow label="Processar em segundo plano" description="Importação sem bloquear o uso.">
      <ToggleField
        label="Processar em segundo plano"
        checked={preferences.allowBackgroundProcessing}
        onChange={(value) => onChange('allowBackgroundProcessing', value)}
      />
    </SettingsRow>
    <SettingsRow
      label="Pausar tarefas durante a reprodução"
      description="Prioriza o player sobre a indexação."
    >
      <ToggleField
        label="Pausar tarefas durante a reprodução"
        checked={preferences.pauseTasksDuringPlayback}
        onChange={(value) => onChange('pauseTasksDuringPlayback', value)}
      />
    </SettingsRow>
    <SettingsRow label="Priorizar economia de recursos" description="Reduz uso de CPU e disco.">
      <ToggleField
        label="Priorizar economia de recursos"
        checked={preferences.prioritizeLowResource}
        onChange={(value) => onChange('prioritizeLowResource', value)}
      />
    </SettingsRow>
    {showDevelopmentNote && (
      <p style={{ color: '#64748B', fontSize: '12px', margin: 0 }}>
        A reprodução sempre tem prioridade. Nenhuma tarefa real é iniciada nesta demonstração.
      </p>
    )}
  </section>
);

ProcessingSettings.displayName = 'ProcessingSettings';
