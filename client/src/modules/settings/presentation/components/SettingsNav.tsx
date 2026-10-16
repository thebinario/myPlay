import React from 'react';

export type SettingsSectionId = 'libraries' | 'playback' | 'appearance' | 'processing' | 'about';

const SECTIONS: { id: SettingsSectionId; label: string }[] = [
  { id: 'libraries', label: 'Bibliotecas' },
  { id: 'playback', label: 'Reprodução' },
  { id: 'appearance', label: 'Aparência' },
  { id: 'processing', label: 'Processamento' },
  { id: 'about', label: 'Sobre' },
];

export interface SettingsNavProps {
  active: SettingsSectionId;
  onSelect: (section: SettingsSectionId) => void;
}

export const SettingsNav: React.FC<SettingsNavProps> = ({ active, onSelect }) => (
  <nav
    aria-label="Categorias de configurações"
    style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}
  >
    {SECTIONS.map((section) => {
      const isActive = section.id === active;
      return (
        <button
          key={section.id}
          type="button"
          aria-pressed={isActive}
          onClick={() => onSelect(section.id)}
          style={{
            padding: '8px 14px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: isActive ? 600 : 500,
            color: isActive ? '#A594FF' : '#94A3B8',
            backgroundColor: isActive ? 'rgba(165, 148, 255, 0.15)' : 'transparent',
            border: isActive
              ? '1px solid rgba(165, 148, 255, 0.4)'
              : '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {section.label}
        </button>
      );
    })}
  </nav>
);

SettingsNav.displayName = 'SettingsNav';
