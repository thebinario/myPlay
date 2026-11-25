import { useCallback, useEffect, useState } from 'react';
import type { BlockDraft, StudyTrackView } from '@/modules/study/domain/study';
import { useStudyRepository } from '@/modules/study/presentation/providers/StudyProvider';
import { errorMessage } from './error-message';

/**
 * Rascunho local do cronograma semanal até o usuário salvar. O núcleo valida a
 * semana inteira (sobreposição, limites, trilhas) e devolve o que valeu.
 */
export function useScheduleDraft() {
  const repository = useStudyRepository();
  const [blocks, setBlocks] = useState<BlockDraft[]>([]);
  const [tracks, setTracks] = useState<StudyTrackView[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([repository.getSchedule(), repository.listTracks()])
      .then(([schedule, list]) => {
        if (cancelled) return;
        setBlocks(schedule);
        setTracks(list);
      })
      .catch((cause: unknown) => !cancelled && setError(errorMessage(cause)));
    return () => {
      cancelled = true;
    };
  }, [repository]);

  const add = useCallback((added: BlockDraft[]) => {
    setBlocks((current) => [...current, ...added]);
    setDirty(true);
    setSavedAt(null);
  }, []);

  const remove = useCallback((target: BlockDraft) => {
    setBlocks((current) => current.filter((block) => block !== target));
    setDirty(true);
    setSavedAt(null);
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      setBlocks(await repository.saveSchedule(blocks));
      setDirty(false);
      setSavedAt(Date.now());
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }, [repository, blocks]);

  return { blocks, tracks, dirty, saving, error, saved: savedAt !== null, add, remove, save };
}
