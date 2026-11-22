import { useEffect, useState } from 'react';
import type { SubtitleTrack } from '@/core/domain/library';
import { subtitleLabel, type CueView } from '@/modules/player/domain/subtitles';
import { useSubtitlesRepository } from '@/modules/player/presentation/providers/SubtitlesProvider';

export type LoadedSubtitleTrack = SubtitleTrack & { cues: CueView[]; generated: boolean };

/**
 * Carrega do backend as legendas da aula (arquivos e transcrição local). Retorna
 * null quando não há repositório (modo demonstração), para manter o fallback.
 */
export function useLessonSubtitles(lessonId: string): LoadedSubtitleTrack[] | null {
  const repository = useSubtitlesRepository();
  const [tracks, setTracks] = useState<LoadedSubtitleTrack[] | null>(repository ? [] : null);

  useEffect(() => {
    if (!repository) return;
    let active = true;
    setTracks([]);
    repository
      .forLesson(lessonId)
      .then((loaded) => {
        if (!active) return;
        setTracks(
          loaded.map((track) => ({
            id: track.id,
            label: subtitleLabel(track.language, track.generated),
            language: track.language ?? 'und',
            cues: track.cues,
            generated: track.generated,
          })),
        );
      })
      .catch(() => {
        if (active) setTracks([]);
      });
    return () => {
      active = false;
    };
  }, [repository, lessonId]);

  return tracks;
}
