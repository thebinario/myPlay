import { createContext, useContext, type ReactNode } from 'react';
import type { DuplicatesRepository } from '@/modules/library/domain/duplicates';

/** Modo demonstração: sem núcleo, não há análise de mídia. */
const emptyDuplicatesRepository: DuplicatesRepository = {
  listGroups: async () => [],
  analysisStatus: async () => ({ pending: 0, analyzed: 0, failed: 0 }),
};

const DuplicatesContext = createContext<DuplicatesRepository>(emptyDuplicatesRepository);

/** Seam de DI do read model de duplicatas. Sem provider, usa o repositório vazio. */
export function DuplicatesProvider({
  repository,
  children,
}: {
  repository?: DuplicatesRepository;
  children: ReactNode;
}) {
  return (
    <DuplicatesContext.Provider value={repository ?? emptyDuplicatesRepository}>
      {children}
    </DuplicatesContext.Provider>
  );
}

export function useDuplicatesRepository(): DuplicatesRepository {
  return useContext(DuplicatesContext);
}
