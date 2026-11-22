import { createContext, useContext, type ReactNode } from 'react';
import type { ContentSearchRepository } from '@/modules/search/domain/content-search';

/** Modo demonstração: sem núcleo, não há texto indexado. */
const emptyContentSearch: ContentSearchRepository = { search: async () => [] };

const ContentSearchContext = createContext<ContentSearchRepository>(emptyContentSearch);

/** Seam de DI da busca no conteúdo. Sem provider, nada é encontrado. */
export function ContentSearchProvider({
  repository,
  children,
}: {
  repository?: ContentSearchRepository;
  children: ReactNode;
}) {
  return (
    <ContentSearchContext.Provider value={repository ?? emptyContentSearch}>
      {children}
    </ContentSearchContext.Provider>
  );
}

export function useContentSearchRepository(): ContentSearchRepository {
  return useContext(ContentSearchContext);
}
