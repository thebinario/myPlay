import { createContext, useContext, type ReactNode } from 'react';
import type { LocalAiRepository } from '@/modules/settings/domain/local-ai';

const LocalAiContext = createContext<LocalAiRepository | null>(null);

/** Seam de DI da IA local. Sem provider (modo demonstração), o painel não aparece. */
export function LocalAiProvider({
  repository,
  children,
}: {
  repository?: LocalAiRepository;
  children: ReactNode;
}) {
  return <LocalAiContext.Provider value={repository ?? null}>{children}</LocalAiContext.Provider>;
}

export function useLocalAiRepository(): LocalAiRepository | null {
  return useContext(LocalAiContext);
}
