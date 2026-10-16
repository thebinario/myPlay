import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import type { ImportViewModel } from '@/core/contracts/import';
import { useSourcesContext } from '@/modules/sources/presentation/providers/SourcesProvider';

const TICK_MS = 650;

/**
 * Conecta o fluxo de importação à apresentação. O progresso avança em intervalos
 * regulares; quem escreve testes deve usar o runner diretamente (`advance()`)
 * ou passar `autoAdvance: false` para manter a simulação determinística.
 */
export function useImportFlow(autoAdvance = true): ImportViewModel {
  const { repository, runner } = useSourcesContext();

  const subscribe = useCallback((listener: () => void) => runner.subscribe(listener), [runner]);
  const getSnapshot = useCallback(() => runner.getState(), [runner]);
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (!autoAdvance || state.phase !== 'scanning') return;
    const interval = window.setInterval(() => runner.advance(), TICK_MS);
    return () => window.clearInterval(interval);
  }, [autoAdvance, runner, state.phase]);

  const start = useCallback(() => runner.start(repository.list()), [runner, repository]);

  return useMemo<ImportViewModel>(
    () => ({
      state,
      start,
      pause: () => runner.pause(),
      resume: () => runner.resume(),
      retry: () => runner.retry(),
      setScenario: (scenario) => runner.setScenario(scenario),
      advance: () => runner.advance(),
      reset: () => runner.reset(),
    }),
    [state, runner, start],
  );
}
