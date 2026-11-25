/**
 * "Reorganizar com IA" como o núcleo entrega (read model). A IA local propõe os
 * módulos no backend; a interface só mostra a proposta e envia aplicar/descartar.
 */
export type SuggestionStatusView = 'pending' | 'running' | 'ready' | 'failed';

export interface SuggestedModuleView {
  title: string;
  lessonIds: string[];
}

export interface OrganizationSuggestionView {
  courseId: string;
  status: SuggestionStatusView;
  modules: SuggestedModuleView[];
  modelId: string | null;
  error: string | null;
}

export interface OrganizationSuggestionStateView {
  /** Falso quando a IA local está desligada ou indisponível. */
  available: boolean;
  suggestion: OrganizationSuggestionView | null;
}

export interface OrganizationSuggestionRepository {
  get(courseId: string): Promise<OrganizationSuggestionStateView>;
  request(courseId: string): Promise<void>;
  apply(courseId: string): Promise<void>;
  dismiss(courseId: string): Promise<void>;
}

/** Sem núcleo (browser/Storybook): a IA não existe. */
export const unavailableOrganizationSuggestions: OrganizationSuggestionRepository = {
  get: async () => ({ available: false, suggestion: null }),
  request: async () => {
    throw new Error('IA local indisponível');
  },
  apply: async () => {},
  dismiss: async () => {},
};
