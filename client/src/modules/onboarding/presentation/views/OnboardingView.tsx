import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';
import type { SourcesViewModel } from '@/core/contracts/library-sources';
import type { ImportViewModel } from '@/core/contracts/import';
import { Button } from '@/shared/ui/components/Button';
import type { OnboardingStep } from '@/modules/onboarding/domain/onboarding';
import { OnboardingStepper } from '@/modules/onboarding/presentation/components/OnboardingStepper';
import { WelcomeStep } from '@/modules/onboarding/presentation/components/WelcomeStep';
import { SourceSelectionStep } from '@/modules/onboarding/presentation/components/SourceSelectionStep';
import { DiscoveryStep } from '@/modules/onboarding/presentation/components/DiscoveryStep';
import { OnboardingCompleteStep } from '@/modules/onboarding/presentation/components/OnboardingCompleteStep';

export interface OnboardingViewProps {
  sources: SourcesViewModel;
  importFlow: ImportViewModel;
  /** Concluiu o assistente (entrar na Biblioteca). */
  onFinish: () => void;
  /** Pulou o assistente (acessar a Biblioteca). */
  onSkip: () => void;
  /** Etapa inicial (útil para Storybook e testes de estado). */
  initialStep?: OnboardingStep;
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({
  sources,
  importFlow,
  onFinish,
  onSkip,
  initialStep = 'welcome',
}) => {
  const [step, setStep] = useState<OnboardingStep>(initialStep);

  const startDiscovery = () => {
    importFlow.start();
    setStep('discovery');
  };

  return (
    <div
      data-testid="onboarding-view"
      style={{
        minHeight: '100vh',
        backgroundColor: '#0D111B',
        display: 'flex',
        justifyContent: 'center',
        padding: 'clamp(16px, 4vw, 40px)',
        boxSizing: 'border-box',
      }}
    >
      <main
        style={{
          width: '100%',
          maxWidth: '680px',
          display: 'grid',
          gap: '24px',
          alignContent: 'start',
        }}
      >
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: '#C4B5FD',
              fontWeight: 700,
              letterSpacing: '0.5px',
            }}
          >
            <BookOpen size={22} aria-hidden />
            MIDOTECA
          </span>
          {step !== 'complete' && (
            <Button variant="ghost" size="sm" onClick={onSkip}>
              Sair
            </Button>
          )}
        </header>

        <OnboardingStepper current={step} />

        {step === 'welcome' && <WelcomeStep onStart={() => setStep('sources')} onSkip={onSkip} />}
        {step === 'sources' && (
          <SourceSelectionStep sources={sources} onContinue={startDiscovery} onSkip={onSkip} />
        )}
        {step === 'discovery' && (
          <DiscoveryStep importFlow={importFlow} onContinue={() => setStep('complete')} />
        )}
        {step === 'complete' && (
          <OnboardingCompleteStep sources={sources.sources} onFinish={onFinish} />
        )}

        <p style={{ color: '#475569', fontSize: '12px', margin: 0, textAlign: 'center' }}>
          Protótipo com dados fictícios. Nenhuma pasta do computador é acessada.
        </p>
      </main>
    </div>
  );
};

OnboardingView.displayName = 'OnboardingView';
