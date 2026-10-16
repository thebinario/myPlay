import React from 'react';
import {
  ONBOARDING_STEPS,
  ONBOARDING_STEP_LABEL,
  stepIndex,
  type OnboardingStep,
} from '@/modules/onboarding/domain/onboarding';

export interface OnboardingStepperProps {
  current: OnboardingStep;
}

export const OnboardingStepper: React.FC<OnboardingStepperProps> = ({ current }) => {
  const activeIndex = stepIndex(current);
  return (
    <ol
      aria-label="Etapas do primeiro acesso"
      style={{ display: 'flex', gap: '8px', listStyle: 'none', padding: 0, margin: 0 }}
    >
      {ONBOARDING_STEPS.map((step, index) => {
        const isDone = index < activeIndex;
        const isActive = index === activeIndex;
        return (
          <li key={step} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <span
              aria-hidden
              style={{
                height: '4px',
                borderRadius: '4px',
                backgroundColor: isDone || isActive ? '#A594FF' : '#334155',
              }}
            />
            <span
              aria-current={isActive ? 'step' : undefined}
              style={{ fontSize: '11px', color: isActive ? '#E9D5FF' : '#64748B' }}
            >
              {ONBOARDING_STEP_LABEL[step]}
            </span>
          </li>
        );
      })}
    </ol>
  );
};

OnboardingStepper.displayName = 'OnboardingStepper';
