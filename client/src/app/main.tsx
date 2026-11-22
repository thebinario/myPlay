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
import { IpcPreferencesRepository } from '@/modules/settings/infrastructure/ipc/ipc-preferences.repository';
import { IpcDuplicatesRepository } from '@/modules/library/infrastructure/ipc/ipc-duplicates.repository';
import { DuplicatesProvider } from '@/modules/library/presentation/DuplicatesProvider';
import { IpcContentSearchRepository } from '@/modules/search/infrastructure/ipc/ipc-content-search.repository';
import { ContentSearchProvider } from '@/modules/search/presentation/ContentSearchProvider';
import { IpcSubtitlesRepository } from '@/modules/player/infrastructure/ipc/ipc-subtitles.repository';
import { SubtitlesProvider } from '@/modules/player/presentation/providers/SubtitlesProvider';
import { IpcLocalAiRepository } from '@/modules/settings/infrastructure/ipc/ipc-local-ai.repository';
import { LocalAiProvider } from '@/modules/settings/presentation/providers/LocalAiProvider';
import { IpcAssistantRepository } from '@/modules/assistant/infrastructure/ipc/ipc-assistant.repository';
import { AssistantProvider } from '@/modules/assistant/presentation/AssistantProvider';
import { IpcOnboardingRepository } from '@/modules/onboarding/infrastructure/ipc/ipc-onboarding.repository';
import '@/index.css';

// Composition root: adapters concretos (mock persistente sobrevive a recarregamentos).
const mockRepository = new MockLibraryService(localStorageLibraryStorage);

const bridge = getMidotecaBridge();
// A seleção depende da capacidade do runtime, não do modo de build.
const runtimeBridge = bridge ? requireMidotecaBridge() : null;
const sourcesRepository = runtimeBridge
  ? new IpcLibrarySourcesRepository(runtimeBridge)
  : undefined;
const importRunner = runtimeBridge ? new IpcImportRunner(runtimeBridge) : undefined;
if (sourcesRepository) void sourcesRepository.hydrate();

const preferencesRepository = runtimeBridge
  ? new IpcPreferencesRepository(runtimeBridge)
  : mockPreferencesRepository;
if (preferencesRepository instanceof IpcPreferencesRepository) void preferencesRepository.hydrate();

const onboardingRepository = runtimeBridge
  ? new IpcOnboardingRepository(runtimeBridge)
  : mockOnboardingRepository;
if (onboardingRepository instanceof IpcOnboardingRepository) void onboardingRepository.hydrate();

// No desktop o catálogo (cursos/documentos) e operações persistentes usam o núcleo SQLite;
// fallback para mock delegado ocorre apenas se o runtime for puramente web/storybook.
const libraryRepository = runtimeBridge
  ? new IpcLibraryRepository(runtimeBridge, mockRepository)
  : mockRepository;
if (libraryRepository instanceof IpcLibraryRepository) libraryRepository.hydrate();

const duplicatesRepository = runtimeBridge ? new IpcDuplicatesRepository(runtimeBridge) : undefined;
const subtitlesRepository = runtimeBridge ? new IpcSubtitlesRepository(runtimeBridge) : undefined;
const localAiRepository = runtimeBridge ? new IpcLocalAiRepository(runtimeBridge) : undefined;
const assistantRepository = runtimeBridge ? new IpcAssistantRepository(runtimeBridge) : undefined;
const contentSearchRepository = runtimeBridge
  ? new IpcContentSearchRepository(runtimeBridge)
  : undefined;

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <LibraryProvider repository={libraryRepository}>
      <DuplicatesProvider repository={duplicatesRepository}>
        <ContentSearchProvider repository={contentSearchRepository}>
          <SubtitlesProvider repository={subtitlesRepository}>
            <LocalAiProvider repository={localAiRepository}>
              <AssistantProvider repository={assistantRepository}>
                <SettingsProvider repository={preferencesRepository}>
                  <SourcesProvider
                    repository={sourcesRepository ?? mockLibrarySourcesRepository}
                    runner={importRunner}
                    picker={bridge ?? undefined}
                  >
                    <OnboardingProvider repository={onboardingRepository}>
                      <App />
                    </OnboardingProvider>
                  </SourcesProvider>
                </SettingsProvider>
              </AssistantProvider>
            </LocalAiProvider>
          </SubtitlesProvider>
        </ContentSearchProvider>
      </DuplicatesProvider>
    </LibraryProvider>
  </React.StrictMode>,
);
