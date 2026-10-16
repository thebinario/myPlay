import { createContext, useContext, type ReactNode } from 'react';
import type { OnboardingRepository } from '@/core/contracts/onboarding';
import { mockOnboardingRepository } from '@/modules/onboarding/infrastructure/mock-onboarding.repository';

const OnboardingContext = createContext<OnboardingRepository>(mockOnboardingRepository);

interface OnboardingProviderProps {
  repository?: OnboardingRepository;
  children: ReactNode;
}

/** Seam de DI local do contexto `onboarding`. Sem provider, usa o adapter mockado padrão. */
export function OnboardingProvider({ repository, children }: OnboardingProviderProps) {
  return (
    <OnboardingContext.Provider value={repository ?? mockOnboardingRepository}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboardingRepository(): OnboardingRepository {
  return useContext(OnboardingContext);
}
