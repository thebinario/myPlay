import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/app/App';
import { LibraryProvider } from '@/modules/library/presentation/LibraryProvider';
import { MockLibraryService } from '@/modules/library/infrastructure/mock-library-repository';
import { localStorageLibraryStorage } from '@/modules/library/infrastructure/library-storage';
import { SourcesProvider } from '@/modules/sources/presentation/providers/SourcesProvider';
import { mockLibrarySourcesRepository } from '@/modules/sources/infrastructure/mock/mock-library-sources.repository';
import { SettingsProvider } from '@/modules/settings/presentation/providers/SettingsProvider';
import { mockPreferencesRepository } from '@/modules/settings/infrastructure/mock-preferences.repository';
import { OnboardingProvider } from '@/modules/onboarding/presentation/providers/OnboardingProvider';
import { mockOnboardingRepository } from '@/modules/onboarding/infrastructure/mock-onboarding.repository';
import '@/index.css';

// Composition root: adapters concretos (mock persistente sobrevive a recarregamentos).
const repository = new MockLibraryService(localStorageLibraryStorage);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <LibraryProvider repository={repository}>
      <SettingsProvider repository={mockPreferencesRepository}>
        <SourcesProvider repository={mockLibrarySourcesRepository}>
          <OnboardingProvider repository={mockOnboardingRepository}>
            <App />
          </OnboardingProvider>
        </SourcesProvider>
      </SettingsProvider>
    </LibraryProvider>
  </React.StrictMode>,
);
