import React from 'react';
import { CheckCircle2, HardDrive, Info } from 'lucide-react';
import type { LibrarySource } from '@/core/domain/library-source';
import { Button } from '@/shared/ui/components/Button';

export interface OnboardingCompleteStepProps {
  sources: LibrarySource[];
  onFinish: () => void;
}

export const OnboardingCompleteStep: React.FC<OnboardingCompleteStepProps> = ({
  sources,
  onFinish,
}) => (
  <section
    aria-labelledby="onboarding-complete-title"
    style={{
      backgroundColor: '#141A28',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '16px',
      padding: '32px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    }}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        color: '#10B981',
      }}
    >
      <CheckCircle2 size={26} aria-hidden />
      <h1
        id="onboarding-complete-title"
        style={{ color: '#FFFFFF', fontSize: '22px', fontWeight: 700, margin: 0 }}
      >
        Tudo pronto para começar
      </h1>
    </div>

    <div>
      <p style={{ color: '#94A3B8', fontSize: '13px', margin: '0 0 8px' }}>
        Fontes adicionadas ({sources.length}):
      </p>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '6px' }}>
        {sources.map((source) => (
          <li
            key={source.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#E2E8F0',
              fontSize: '13px',
            }}
          >
            <HardDrive size={14} color="#A594FF" aria-hidden />
            {source.path}
          </li>
        ))}
        {sources.length === 0 && (
          <li style={{ color: '#64748B', fontSize: '13px' }}>Nenhuma fonte adicionada.</li>
        )}
      </ul>
    </div>

    <p
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        color: '#64748B',
        fontSize: '12px',
        margin: 0,
      }}
    >
      <Info size={14} aria-hidden />
      Você pode adicionar mais fontes a qualquer momento em Configurações.
    </p>

    <div>
      <Button variant="violet" size="lg" onClick={onFinish}>
        Entrar na Biblioteca
      </Button>
    </div>
  </section>
);

OnboardingCompleteStep.displayName = 'OnboardingCompleteStep';
