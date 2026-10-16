import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { LibrarySourcesRepository } from '@/core/contracts/library-sources';
import type { ImportRunner } from '@/core/contracts/import';
import { mockLibrarySourcesRepository } from '@/modules/sources/infrastructure/mock/mock-library-sources.repository';
import { createMockImportRunner } from '@/modules/sources/infrastructure/mock/import-runner';
import { recordSourceScan } from '@/modules/sources/application/use-cases/record-source-scan';

interface SourcesContextValue {
  repository: LibrarySourcesRepository;
  runner: ImportRunner;
}

const SourcesContext = createContext<SourcesContextValue | null>(null);

/** Cria um runner já conectado aos resultados de análise do repositório dado. */
function createRunnerFor(repository: LibrarySourcesRepository): ImportRunner {
  return createMockImportRunner({
    onSourceScanned: (id, itemCount, scannedAt) =>
      recordSourceScan({ repository }, id, itemCount, scannedAt),
  });
}

const defaultValue: SourcesContextValue = {
  repository: mockLibrarySourcesRepository,
  runner: createRunnerFor(mockLibrarySourcesRepository),
};

interface SourcesProviderProps {
  repository?: LibrarySourcesRepository;
  runner?: ImportRunner;
  children: ReactNode;
}

/**
 * Seam de DI local do contexto `sources`. Sem provider, usa os adapters mockados
 * padrão (mantém Storybook e testes simples). A injeção do adapter concreto
 * (IPC/Tauri) acontece no composition root (`app/main.tsx`).
 */
export function SourcesProvider({ repository, runner, children }: SourcesProviderProps) {
  const value = useMemo<SourcesContextValue>(() => {
    const repo = repository ?? mockLibrarySourcesRepository;
    return { repository: repo, runner: runner ?? createRunnerFor(repo) };
  }, [repository, runner]);
  return <SourcesContext.Provider value={value}>{children}</SourcesContext.Provider>;
}

export function useSourcesContext(): SourcesContextValue {
  return useContext(SourcesContext) ?? defaultValue;
}
