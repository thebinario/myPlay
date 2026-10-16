import type { OnboardingRepository } from '@/core/contracts/onboarding';
import {
  createInMemoryOnboardingStorage,
  localStorageOnboardingStorage,
  type OnboardingStorage,
} from '@/modules/onboarding/infrastructure/onboarding-storage';

/**
 * Adapter mockado do estado de primeiro acesso. Persiste via `localStorage`,
 * de modo que concluir ou pular o onboarding sobrevive a recarregamentos.
 */
export class MockOnboardingRepository implements OnboardingRepository {
  constructor(private storage: OnboardingStorage = localStorageOnboardingStorage) {}

  isCompleted(): boolean {
    return this.storage.isCompleted();
  }

  complete(): void {
    this.storage.setCompleted(true);
  }

  reset(): void {
    this.storage.setCompleted(false);
  }
}

export const mockOnboardingRepository = new MockOnboardingRepository();

export function createInMemoryOnboardingRepository(completed = false): MockOnboardingRepository {
  return new MockOnboardingRepository(createInMemoryOnboardingStorage(completed));
}
