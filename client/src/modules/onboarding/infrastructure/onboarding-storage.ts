/** Porta de persistência do estado de primeiro acesso. */
export interface OnboardingStorage {
  isCompleted(): boolean;
  setCompleted(value: boolean): void;
}

const STORAGE_KEY = 'midoteca:onboarding:v1';

/** Chave usada pelos testes para simular uma instalação inicial. */
export const ONBOARDING_STORAGE_KEY = STORAGE_KEY;

export const localStorageOnboardingStorage: OnboardingStorage = {
  isCompleted() {
    if (typeof localStorage === 'undefined') return false;
    try {
      return localStorage.getItem(STORAGE_KEY) === 'complete';
    } catch {
      return false;
    }
  },
  setCompleted(value) {
    if (typeof localStorage === 'undefined') return;
    try {
      if (value) localStorage.setItem(STORAGE_KEY, 'complete');
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  },
};

/** Adapter em memória — determinístico para testes. */
export function createInMemoryOnboardingStorage(completed = false): OnboardingStorage {
  let value = completed;
  return {
    isCompleted: () => value,
    setCompleted: (next) => {
      value = next;
    },
  };
}
