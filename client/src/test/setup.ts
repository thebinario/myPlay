import '@testing-library/jest-dom';
import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { mockLibraryService } from '@/modules/library/infrastructure/mock-library-repository';
import { mockLibrarySourcesRepository } from '@/modules/sources/infrastructure/mock/mock-library-sources.repository';
import { mockPreferencesRepository } from '@/modules/settings/infrastructure/mock-preferences.repository';
import { ONBOARDING_STORAGE_KEY } from '@/modules/onboarding/infrastructure/onboarding-storage';

// Automatically cleanup DOM after each test
afterEach(() => {
  cleanup();
});

// Estado determinístico: cada teste começa com o catálogo de exemplo, sem
// fontes/preferências herdadas e com o onboarding já concluído (o primeiro
// acesso é exercitado explicitamente nos testes de onboarding).
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(ONBOARDING_STORAGE_KEY, 'complete');
  mockLibraryService.resetAll();
  mockLibraryService.getItems().forEach((item) => {
    item.sourceId = item.type === 'movie' ? 'demo-movies' : 'demo-courses';
  });
  mockLibrarySourcesRepository.reset();
  mockPreferencesRepository.reset();
});

// Mock window.matchMedia if not implemented in jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
