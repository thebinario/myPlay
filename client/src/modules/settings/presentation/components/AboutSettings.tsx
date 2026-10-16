import React from 'react';
import { APP_CONFIG } from '@/core/config/app.config';

export interface AboutSettingsProps {
  librarySummary: { courses: number; movies: number; documents: number };
}

export const AboutSettings: React.FC<AboutSettingsProps> = ({ librarySummary }) => {
  const total = librarySummary.courses + librarySummary.movies + librarySummary.documents;
  return (
    <section aria-labelledby="settings-about" style={{ display: 'grid', gap: '12px' }}>
      <h2 id="settings-about" style={{ color: '#F0F4FC', fontSize: '16px', margin: 0 }}>
        Sobre
      </h2>
      <dl style={{ display: 'grid', gap: '8px', margin: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <dt style={{ color: '#94A3B8', fontSize: '13px' }}>Aplicativo</dt>
          <dd style={{ color: '#E2E8F0', fontSize: '13px', margin: 0 }}>{APP_CONFIG.name}</dd>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <dt style={{ color: '#94A3B8', fontSize: '13px' }}>Versão</dt>
          <dd style={{ color: '#E2E8F0', fontSize: '13px', margin: 0 }}>{APP_CONFIG.version}</dd>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <dt style={{ color: '#94A3B8', fontSize: '13px' }}>Estado da biblioteca</dt>
          <dd style={{ color: '#E2E8F0', fontSize: '13px', margin: 0 }}>{total} conteúdos</dd>
        </div>
      </dl>
      <p style={{ color: '#64748B', fontSize: '12px', margin: 0 }}>
        Cursos, vídeos e documentos são organizados a partir das bibliotecas locais.
      </p>
    </section>
  );
};

AboutSettings.displayName = 'AboutSettings';
