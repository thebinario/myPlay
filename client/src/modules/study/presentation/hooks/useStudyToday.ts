import { useCallback, useEffect, useState } from 'react';
import type {
  LogSessionCommand,
  StudyActivity,
  StudyDay,
  StudyTrackView,
  StudyWeek,
} from '@/modules/study/domain/study';
import { useStudyRepository } from '@/modules/study/presentation/providers/StudyProvider';
import { errorMessage } from './error-message';

/** O núcleo recalcula o foco com o relógio; a tela pede uma nova leitura a cada minuto. */
const REFRESH_MS = 60_000;

/**
 * Estado da aba "Hoje": lê o dia, a semana e as trilhas do núcleo e envia os
 * comandos (cronômetro, registros). Nada é recalculado aqui.
 */
export function useStudyToday() {
  const repository = useStudyRepository();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [day, setDay] = useState<StudyDay | null>(null);
  const [week, setWeek] = useState<StudyWeek | null>(null);
  const [tracks, setTracks] = useState<StudyTrackView[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [nextDay, nextWeek, nextTracks] = await Promise.all([
        repository.getDay(selectedDate),
        repository.getWeek(selectedDate),
        repository.listTracks(),
      ]);
      setDay(nextDay);
      setWeek(nextWeek);
      setTracks(nextTracks);
      setLoadError(null);
    } catch (cause) {
      setLoadError(errorMessage(cause));
    }
  }, [repository, selectedDate]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), REFRESH_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  const run = useCallback(
    async (action: () => Promise<unknown>): Promise<boolean> => {
      setBusy(true);
      setError(null);
      try {
        await action();
        await refresh();
        return true;
      } catch (cause) {
        setError(errorMessage(cause));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  return {
    available: repository.available,
    day,
    week,
    tracks,
    selectedDate,
    selectDate: setSelectedDate,
    loadError,
    error,
    busy,
    startTimer: (trackId: string, activity?: StudyActivity | null) =>
      run(() => repository.startTimer(trackId, activity)),
    stopTimer: () => run(() => repository.stopTimer()),
    discardTimer: () => run(() => repository.stopTimer({ discard: true })),
    logSession: (command: LogSessionCommand) => run(() => repository.logSession(command)),
    deleteSession: (sessionId: string) => run(() => repository.deleteSession(sessionId)),
  };
}

export type StudyTodayState = ReturnType<typeof useStudyToday>;
