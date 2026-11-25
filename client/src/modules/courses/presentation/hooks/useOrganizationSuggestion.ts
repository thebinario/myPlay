import { useCallback, useEffect, useState } from 'react';
import type { OrganizationSuggestionStateView } from '@/modules/courses/domain/organization-suggestion';
import { useOrganizationSuggestionRepository } from '@/modules/courses/presentation/OrganizationSuggestionProvider';

export interface OrganizationSuggestionViewModel {
  state: OrganizationSuggestionStateView | null;
  /** Ação em andamento (pedido, aplicação ou descarte). */
  busy: boolean;
  /** Motivo devolvido pelo núcleo na última ação recusada. */
  error: string | null;
  request(): void;
  apply(): void;
  dismiss(): void;
}

/**
 * Estado de "Reorganizar com IA" para um curso. A geração roda num job do
 * núcleo; enquanto está na fila ou rodando, o estado é relido a cada `pollMs`.
 */
export function useOrganizationSuggestion(
  courseId: string,
  pollMs = 2000,
): OrganizationSuggestionViewModel {
  const repository = useOrganizationSuggestionRepository();
  const [state, setState] = useState<OrganizationSuggestionStateView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setState(await repository.get(courseId));
  }, [repository, courseId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const status = state?.suggestion?.status;
  useEffect(() => {
    if (status !== 'pending' && status !== 'running') return;
    const timer = window.setInterval(() => void reload(), pollMs);
    return () => window.clearInterval(timer);
  }, [status, pollMs, reload]);

  const run = useCallback(
    (action: (id: string) => Promise<void>) => {
      setBusy(true);
      setError(null);
      void action(courseId)
        .catch((reason: unknown) =>
          setError(reason instanceof Error ? reason.message : String(reason)),
        )
        .then(reload)
        .finally(() => setBusy(false));
    },
    [courseId, reload],
  );

  return {
    state,
    busy,
    error,
    request: () => run((id) => repository.request(id)),
    apply: () => run((id) => repository.apply(id)),
    dismiss: () => run((id) => repository.dismiss(id)),
  };
}
