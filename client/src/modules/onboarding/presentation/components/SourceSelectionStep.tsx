import React from 'react';
import { FolderOpen, HardDrive, Trash2 } from 'lucide-react';
import type { SourcesViewModel } from '@/core/contracts/library-sources';
import { Button } from '@/shared/ui/components/Button';
import { AddSourceForm } from '@/shared/ui/components/AddSourceForm';

export interface SourceSelectionStepProps {
  sources: SourcesViewModel;
  onContinue: () => void;
  onSkip: () => void;
}

export const SourceSelectionStep: React.FC<SourceSelectionStepProps> = ({
  sources,
  onContinue,
  onSkip,
}) => {
  const selected = sources.sources;
  return (
    <section aria-labelledby="onboarding-sources-title" style={{ display: 'grid', gap: '18px' }}>
      <header>
        <h1
          id="onboarding-sources-title"
          style={{ color: '#FFFFFF', fontSize: '22px', fontWeight: 700, margin: '0 0 6px' }}
        >
          Onde estão seus arquivos?
        </h1>
        <p style={{ color: '#94A3B8', fontSize: '13px', margin: 0 }}>
          Adicione pastas locais ou HDs externos. Você pode adicionar mais fontes depois.
        </p>
      </header>

      <AddSourceForm
        onAdd={sources.addSource}
        label="Caminho da pasta ou HD (demonstração)"
        inputId="onboarding-source-path"
      />

      {selected.length === 0 ? (
        <p
          style={{
            color: '#64748B',
            fontSize: '13px',
            margin: 0,
            padding: '16px',
            border: '1px dashed rgba(255,255,255,0.12)',
            borderRadius: '10px',
          }}
        >
          Nenhuma fonte adicionada ainda.
        </p>
      ) : (
        <ul
          aria-label="Fontes selecionadas"
          style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '8px' }}
        >
          {selected.map((source) => (
            <li
              key={source.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                backgroundColor: '#131A27',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px',
                padding: '10px 12px',
              }}
            >
              <HardDrive size={16} color="#A594FF" aria-hidden />
              <span
                style={{ flex: 1, color: '#E2E8F0', fontSize: '13px', overflowWrap: 'anywhere' }}
              >
                {source.path}
              </span>
              <button
                type="button"
                aria-label={`Remover ${source.name}`}
                onClick={() => sources.removeSource(source.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: 'transparent',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                }}
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <Button variant="violet" size="md" onClick={onContinue} disabled={selected.length === 0}>
          <FolderOpen size={15} style={{ marginRight: '6px' }} aria-hidden />
          Analisar biblioteca
        </Button>
        <Button variant="ghost" size="md" onClick={onSkip}>
          Configurar depois
        </Button>
      </div>
    </section>
  );
};

SourceSelectionStep.displayName = 'SourceSelectionStep';
