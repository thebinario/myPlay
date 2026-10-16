import React from 'react';
import { BookOpen, ShieldCheck } from 'lucide-react';
import { Button } from '@/shared/ui/components/Button';

export interface WelcomeStepProps {
  onStart: () => void;
  onSkip: () => void;
}

export const WelcomeStep: React.FC<WelcomeStepProps> = ({ onStart, onSkip }) => (
  <section
    aria-labelledby="onboarding-welcome-title"
    style={{
      backgroundColor: '#141A28',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '16px',
      padding: '40px 32px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      gap: '16px',
    }}
  >
    <BookOpen size={44} color="#A594FF" aria-hidden />
    <h1
      id="onboarding-welcome-title"
      style={{ color: '#FFFFFF', fontSize: '24px', fontWeight: 700, margin: 0 }}
    >
      Bem-vindo à Midoteca
    </h1>
    <p style={{ color: '#94A3B8', fontSize: '14px', margin: 0, maxWidth: '460px' }}>
      Seus cursos, vídeos e documentos em um só lugar. Organize seu acervo local sem sair do ar.
    </p>
    <p
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        color: '#10B981',
        fontSize: '13px',
        margin: 0,
      }}
    >
      <ShieldCheck size={16} aria-hidden />
      Seus arquivos originais permanecem intactos.
    </p>
    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
      <Button variant="violet" size="lg" onClick={onStart}>
        Começar
      </Button>
      <Button variant="secondary" size="lg" onClick={onSkip}>
        Configurar depois
      </Button>
    </div>
  </section>
);

WelcomeStep.displayName = 'WelcomeStep';
