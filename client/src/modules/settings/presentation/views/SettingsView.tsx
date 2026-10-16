import React, { useState } from 'react';
import { useSettings } from '@/modules/settings/presentation/hooks/useSettings';
import {
  SettingsNav,
  type SettingsSectionId,
} from '@/modules/settings/presentation/components/SettingsNav';
import { LibrarySettingsSection } from '@/modules/settings/presentation/components/LibrarySettingsSection';
import { PlaybackSettings } from '@/modules/settings/presentation/components/PlaybackSettings';
import { AppearanceSettings } from '@/modules/settings/presentation/components/AppearanceSettings';
import { ProcessingSettings } from '@/modules/settings/presentation/components/ProcessingSettings';
import { AboutSettings } from '@/modules/settings/presentation/components/AboutSettings';

export interface SettingsViewProps {
  runtime?: 'development' | 'desktop';
  /** Conteúdo do gerenciamento de fontes, injetado pela composição em `app/`. */
  sourcesSection?: React.ReactNode;
  librarySummary?: { courses: number; movies: number; documents: number };
  onResetLibrary?: () => void;
  onOpenOnboarding?: () => void;
}

const cardStyle: React.CSSProperties = {
  backgroundColor: '#141A28',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '12px',
  padding: '22px 24px',
};

export const SettingsView: React.FC<SettingsViewProps> = ({
  runtime = 'development',
  sourcesSection,
  librarySummary = { courses: 0, movies: 0, documents: 0 },
  onResetLibrary,
  onOpenOnboarding,
}) => {
  const { preferences, setPreference } = useSettings();
  const showDevelopmentControls = runtime === 'development';
  const [section, setSection] = useState<SettingsSectionId>('libraries');

  return (
    <div
      data-testid="settings-view"
      style={{
        padding: '32px clamp(16px, 4vw, 40px)',
        maxWidth: '860px',
        margin: '0 auto',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '22px',
      }}
    >
      <header>
        <h1 style={{ color: '#FFFFFF', fontSize: '26px', fontWeight: 700, margin: '0 0 6px' }}>
          Configurações
        </h1>
        <p style={{ color: '#64748B', fontSize: '13px', margin: 0 }}>
          Preferências do aplicativo e gerenciamento da biblioteca local.
        </p>
      </header>

      <SettingsNav active={section} onSelect={setSection} />

      <div style={cardStyle}>
        {section === 'libraries' && (
          <LibrarySettingsSection
            summary={librarySummary}
            sourcesSection={sourcesSection}
            onResetLibrary={onResetLibrary}
            onOpenOnboarding={onOpenOnboarding}
            showDevelopmentControls={showDevelopmentControls}
          />
        )}
        {section === 'playback' && (
          <PlaybackSettings preferences={preferences} onChange={setPreference} />
        )}
        {section === 'appearance' && (
          <AppearanceSettings preferences={preferences} onChange={setPreference} />
        )}
        {section === 'processing' && (
          <ProcessingSettings
            preferences={preferences}
            onChange={setPreference}
            showDevelopmentNote={showDevelopmentControls}
          />
        )}
        {section === 'about' && <AboutSettings librarySummary={librarySummary} />}
      </div>

      {showDevelopmentControls && (
        <p style={{ color: '#64748B', fontSize: '12px', margin: 0 }}>
          Modo demonstração · as preferências permanecem neste dispositivo.
        </p>
      )}
    </div>
  );
};
