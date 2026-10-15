import React, { useState } from 'react';
import { Database, Palette, Info, RotateCcw, Check } from 'lucide-react';
import { useLibrary } from '@/features/library/presentation/LibraryProvider';

const cardStyle: React.CSSProperties = {
  backgroundColor: '#141A28',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '12px',
  padding: '20px 24px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const sectionTitleStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  color: '#F0F4FC',
  fontSize: '15px',
  fontWeight: 600,
};

export const SettingsView: React.FC = () => {
  const { repository, courses, movies, documents } = useLibrary();
  const [feedback, setFeedback] = useState(false);

  const handleResetLibrary = () => {
    repository.resetAll();
    setFeedback(true);
    window.setTimeout(() => setFeedback(false), 3000);
  };

  return (
    <div
      data-testid="settings-view"
      style={{
        padding: '32px 40px',
        maxWidth: '820px',
        margin: '0 auto',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}
    >
      <div>
        <h1
          style={{
            color: '#FFFFFF',
            fontSize: '26px',
            fontWeight: 700,
            margin: '0 0 6px',
            letterSpacing: '-0.4px',
          }}
        >
          Configurações
        </h1>
        <p style={{ color: '#64748B', fontSize: '13px', margin: 0 }}>
          Preferências do aplicativo e gerenciamento da biblioteca local.
        </p>
      </div>

      <section style={cardStyle} aria-labelledby="settings-library">
        <div id="settings-library" style={sectionTitleStyle}>
          <Database size={16} color="#A594FF" />
          Biblioteca
        </div>
        <p style={{ color: '#94A3B8', fontSize: '13px', margin: 0 }}>
          {courses.length} cursos · {movies.length} filmes · {documents.length} PDFs catalogados.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={handleResetLibrary}
            aria-label="Restaurar dados de exemplo da biblioteca"
            data-testid="settings-reset-library"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#A594FF',
              color: '#0D111B',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={14} />
            Restaurar dados de exemplo
          </button>
          {feedback && (
            <span
              data-testid="settings-reset-feedback"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: '#10B981',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              <Check size={15} />
              Biblioteca restaurada
            </span>
          )}
        </div>
      </section>

      <section style={cardStyle} aria-labelledby="settings-appearance">
        <div id="settings-appearance" style={sectionTitleStyle}>
          <Palette size={16} color="#A594FF" />
          Aparência
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#94A3B8', fontSize: '13px' }}>Tema</span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: '#F0F4FC',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: '14px',
                height: '14px',
                borderRadius: '4px',
                backgroundColor: '#0D111B',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            />
            Escuro
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#94A3B8', fontSize: '13px' }}>Cor de destaque</span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: '#F0F4FC',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: '14px',
                height: '14px',
                borderRadius: '4px',
                backgroundColor: '#A594FF',
              }}
            />
            Violeta
          </span>
        </div>
      </section>

      <section style={cardStyle} aria-labelledby="settings-about">
        <div id="settings-about" style={sectionTitleStyle}>
          <Info size={16} color="#A594FF" />
          Sobre
        </div>
        <p style={{ color: '#94A3B8', fontSize: '13px', margin: 0 }}>
          MIDOTECA Desktop — biblioteca local-first de cursos, filmes e documentos.
        </p>
      </section>
    </div>
  );
};
