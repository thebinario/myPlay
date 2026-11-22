import { useCallback, useEffect, useState } from 'react';
import type {
  DuplicateGroupView,
  MediaAnalysisStatusView,
} from '@/modules/library/domain/duplicates';
import { useDuplicatesRepository } from '@/modules/library/presentation/DuplicatesProvider';

interface DuplicateGroupsState {
  groups: DuplicateGroupView[];
  status: MediaAnalysisStatusView | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/** Carrega o read model de duplicatas do backend; só estado transitório de tela. */
export function useDuplicateGroups(): DuplicateGroupsState {
  const repository = useDuplicatesRepository();
  const [groups, setGroups] = useState<DuplicateGroupView[]>([]);
  const [status, setStatus] = useState<MediaAnalysisStatusView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([repository.listGroups(), repository.analysisStatus()])
      .then(([nextGroups, nextStatus]) => {
        if (!active) return;
        setGroups(nextGroups);
        setStatus(nextStatus);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : String(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [repository, version]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);
  return { groups, status, loading, error, reload };
}
