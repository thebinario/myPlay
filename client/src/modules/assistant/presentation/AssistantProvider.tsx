import { createContext, useContext, type ReactNode } from 'react';
import type { AssistantRepository } from '@/modules/assistant/domain/assistant';

const AssistantContext = createContext<AssistantRepository | null>(null);

/** Seam de DI do assistente local. Sem provider (modo demonstração), ele não aparece. */
export function AssistantProvider({
  repository,
  children,
}: {
  repository?: AssistantRepository;
  children: ReactNode;
}) {
  return (
    <AssistantContext.Provider value={repository ?? null}>{children}</AssistantContext.Provider>
  );
}

export function useAssistantRepository(): AssistantRepository | null {
  return useContext(AssistantContext);
}
