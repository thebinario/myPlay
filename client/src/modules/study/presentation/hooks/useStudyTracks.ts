import { useCallback, useEffect, useState } from 'react';
import type { SaveTrackCommand, StudyTrackView } from '@/modules/study/domain/study';
import { useStudyRepository } from '@/modules/study/presentation/providers/StudyProvider';
import { errorMessage } from './error-message';

/** Lista de trilhas ativas e os comandos de criar/arquivar (validados no núcleo). */
export function useStudyTracks() {
  const repository = useStudyRepository();
  const [tracks, setTracks] = useState<StudyTrackView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      setTracks(await repository.listTracks());
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }, [repository]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const run = useCallback(
    async (action: () => Promise<unknown>): Promise<boolean> => {
      setBusy(true);
      setError(null);
      try {
        await action();
        await reload();
        return true;
      } catch (cause) {
        setError(errorMessage(cause));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [reload],
  );

  return {
    tracks,
    error,
    busy,
    save: (command: SaveTrackCommand) => run(() => repository.saveTrack(command)),
    archive: (trackId: string) => run(() => repository.archiveTrack(trackId)),
  };
}
