import { useMemo } from 'react';
import { useOnboardingRepository } from '@/modules/onboarding/presentation/providers/OnboardingProvider';

export interface UseOnboardingResult {
  isCompleted: () => boolean;
  complete: () => void;
  /** Reabre o assistente na próxima renderização do shell. */
  reset: () => void;
}

export function useOnboarding(): UseOnboardingResult {
  const repository = useOnboardingRepository();
  return useMemo(
    () => ({
      isCompleted: () => repository.isCompleted(),
      complete: () => repository.complete(),
      reset: () => repository.reset(),
    }),
    [repository],
  );
}
