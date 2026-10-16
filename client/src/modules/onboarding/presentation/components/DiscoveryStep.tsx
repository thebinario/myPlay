import React from 'react';
import type { ImportViewModel } from '@/core/contracts/import';
import { Button } from '@/shared/ui/components/Button';
import { ImportPanel } from '@/shared/ui/components/ImportPanel';

export interface DiscoveryStepProps {
  importFlow: ImportViewModel;
  onContinue: () => void;
}

export const DiscoveryStep: React.FC<DiscoveryStepProps> = ({ importFlow, onContinue }) => (
  <section aria-labelledby="onboarding-discovery-title" style={{ display: 'grid', gap: '18px' }}>
    <header>
      <h1
        id="onboarding-discovery-title"
        style={{ color: '#FFFFFF', fontSize: '22px', fontWeight: 700, margin: '0 0 6px' }}
      >
        Preparando sua biblioteca
      </h1>
      <p style={{ color: '#94A3B8', fontSize: '13px', margin: 0 }}>
        A descoberta roda em segundo plano. Você pode continuar usando o aplicativo enquanto isso.
      </p>
    </header>

    <ImportPanel flow={importFlow} />

    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
      <Button variant="violet" size="md" onClick={onContinue}>
        Continuar
      </Button>
    </div>
  </section>
);

DiscoveryStep.displayName = 'DiscoveryStep';
