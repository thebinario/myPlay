import { createContext, useContext, type ReactNode } from 'react';
import type { SubtitlesRepository } from '@/modules/player/domain/subtitles';

const SubtitlesContext = createContext<SubtitlesRepository | null>(null);

/**
 * Seam de DI das legendas reais. Sem provider (modo demonstração/stories), o
 * player mantém as faixas do catálogo mockado.
 */
export function SubtitlesProvider({
  repository,
  children,
}: {
  repository?: SubtitlesRepository;
  children: ReactNode;
}) {
  return (
    <SubtitlesContext.Provider value={repository ?? null}>{children}</SubtitlesContext.Provider>
  );
}

export function useSubtitlesRepository(): SubtitlesRepository | null {
  return useContext(SubtitlesContext);
}
