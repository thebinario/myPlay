import React, { useState } from 'react';
import { RotateCcw, Check, Sparkles } from 'lucide-react';
import { Button } from '@/shared/ui/components/Button';

export interface LibrarySettingsSectionProps {
  summary: { courses: number; movies: number; documents: number };
  /** Conteúdo do gerenciamento de fontes, composto em `app/`. */
  sourcesSection?: React.ReactNode;
  onResetLibrary?: () => void;
  onOpenOnboarding?: () => void;
  showDevelopmentControls?: boolean;
}

export const LibrarySettingsSection: React.FC<LibrarySettingsSectionProps> = ({
  summary,
  sourcesSection,
  onResetLibrary,
  onOpenOnboarding,
  showDevelopmentControls = true,
}) => {
  const [feedback, setFeedback] = useState(false);

  const handleReset = () => {
    onResetLibrary?.();
    setFeedback(true);
    window.setTimeout(() => setFeedback(false), 3000);
  };

  return (
    <section aria-labelledby="settings-library" style={{ display: 'grid', gap: '18px' }}>
      <h2 id="settings-library" style={{ color: '#F0F4FC', fontSize: '16px', margin: 0 }}>
        Bibliotecas
      </h2>
      <p style={{ color: '#94A3B8', fontSize: '13px', margin: 0 }}>
        {summary.courses} cursos · {summary.movies} filmes · {summary.documents} PDFs catalogados.
      </p>

      {sourcesSection}

      {showDevelopmentControls && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            variant="violet"
            size="sm"
            data-testid="settings-reset-library"
            onClick={handleReset}
          >
            <RotateCcw size={14} style={{ marginRight: '6px' }} aria-hidden />
            Restaurar dados de exemplo
          </Button>
          {onOpenOnboarding && (
            <Button variant="secondary" size="sm" onClick={onOpenOnboarding}>
              <Sparkles size={14} style={{ marginRight: '6px' }} aria-hidden />
              Abrir primeiro acesso (demonstração)
            </Button>
          )}
          {feedback && (
            <span
              data-testid="settings-reset-feedback"
              role="status"
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
      )}
    </section>
  );
};

LibrarySettingsSection.displayName = 'LibrarySettingsSection';
