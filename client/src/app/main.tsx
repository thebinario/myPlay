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
import { getMidotecaBridge, requireMidotecaBridge } from '@/platform/desktop';
import { IpcLibrarySourcesRepository } from '@/modules/sources/infrastructure/ipc/ipc-library-sources.repository';
import { IpcImportRunner } from '@/modules/sources/infrastructure/ipc/ipc-import-runner';
import { IpcLibraryRepository } from '@/modules/library/infrastructure/ipc/ipc-library-repository';
import '@/index.css';

// Composition root: adapters concretos (mock persistente sobrevive a recarregamentos).
const mockRepository = new MockLibraryService(localStorageLibraryStorage);

// O modo de desenvolvimento preserva os adapters mockados; produção usa SQLite via IPC.
const bridge = getMidotecaBridge();
const runtimeBridge = import.meta.env.PROD ? requireMidotecaBridge() : null;
const sourcesRepository = runtimeBridge
  ? new IpcLibrarySourcesRepository(runtimeBridge)
  : undefined;
const importRunner = runtimeBridge ? new IpcImportRunner(runtimeBridge) : undefined;
if (sourcesRepository) void sourcesRepository.hydrate();

// No desktop o catálogo (cursos/documentos) vem do kernel; reprodução/PDF/busca
// continuam no mock delegado até os contratos respectivos serem migrados (P9).
const libraryRepository = runtimeBridge
  ? new IpcLibraryRepository(runtimeBridge, mockRepository)
  : mockRepository;
if (libraryRepository instanceof IpcLibraryRepository) libraryRepository.hydrate();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <LibraryProvider repository={libraryRepository}>
      <SettingsProvider repository={mockPreferencesRepository}>
        <SourcesProvider
          repository={sourcesRepository ?? mockLibrarySourcesRepository}
          runner={importRunner}
          picker={bridge ?? undefined}
        >
          <OnboardingProvider repository={mockOnboardingRepository}>
            <App />
          </OnboardingProvider>
        </SourcesProvider>
      </SettingsProvider>
    </LibraryProvider>
  </React.StrictMode>,
);
