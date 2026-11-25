import { createContext, useContext, type ReactNode } from 'react';
import { unavailableStudy, type StudyRepository } from '@/modules/study/domain/study';

const StudyContext = createContext<StudyRepository>(unavailableStudy);

/** Seam de DI do cronograma de estudos. Sem provider, o recurso fica indisponível. */
export function StudyProvider({
  repository,
  children,
}: {
  repository?: StudyRepository;
  children: ReactNode;
}) {
  return (
    <StudyContext.Provider value={repository ?? unavailableStudy}>{children}</StudyContext.Provider>
  );
}

export function useStudyRepository(): StudyRepository {
  return useContext(StudyContext);
}
