import { useCallback, useMemo, useSyncExternalStore } from 'react';
import type {
  AddSourceInput,
  AddSourceResult,
  SourcesViewModel,
} from '@/core/contracts/library-sources';
import { addSource } from '@/modules/sources/application/use-cases/add-source';
import { removeSource } from '@/modules/sources/application/use-cases/remove-source';
import {
  disconnectSource,
  reconnectSource,
} from '@/modules/sources/application/use-cases/reconnect-source';
import { checkSourceAvailability } from '@/modules/sources/application/use-cases/check-source-availability';
import { pickSourceDirectory } from '@/modules/sources/application/use-cases/pick-source-directory';
import { useSourcesContext } from '@/modules/sources/presentation/providers/SourcesProvider';

/** Fonte única de verdade das fontes de biblioteca + ações de gerenciamento. */
export function useLibrarySources(): SourcesViewModel {
  const { repository, picker } = useSourcesContext();

  const subscribe = useCallback(
    (listener: () => void) => repository.subscribe(listener),
    [repository],
  );
  const getSnapshot = useCallback(() => repository.list(), [repository]);
  const sources = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return useMemo<SourcesViewModel>(() => {
    const deps = { repository, picker };
    return {
      sources,
      addSource: (input: AddSourceInput): AddSourceResult => addSource(deps, input),
      removeSource: (id) => removeSource(deps, id),
      reconnectSource: (id) => reconnectSource(deps, id),
      disconnectSource: (id) => disconnectSource(deps, id),
      checkSource: (id) => {
        void checkSourceAvailability(deps, id);
      },
      ...(picker ? { pickDirectory: () => pickSourceDirectory(deps) } : {}),
    };
  }, [repository, picker, sources]);
}
