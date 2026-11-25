import { createContext, useContext, type ReactNode } from 'react';
import {
  unavailableOrganizationSuggestions,
  type OrganizationSuggestionRepository,
} from '@/modules/courses/domain/organization-suggestion';

const OrganizationSuggestionContext = createContext<OrganizationSuggestionRepository>(
  unavailableOrganizationSuggestions,
);

/** Seam de DI de "Reorganizar com IA". Sem provider, a IA fica indisponível. */
export function OrganizationSuggestionProvider({
  repository,
  children,
}: {
  repository?: OrganizationSuggestionRepository;
  children: ReactNode;
}) {
  return (
    <OrganizationSuggestionContext.Provider
      value={repository ?? unavailableOrganizationSuggestions}
    >
      {children}
    </OrganizationSuggestionContext.Provider>
  );
}

export function useOrganizationSuggestionRepository(): OrganizationSuggestionRepository {
  return useContext(OrganizationSuggestionContext);
}
