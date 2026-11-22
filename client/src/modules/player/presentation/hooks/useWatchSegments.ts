import { useEffect, useRef } from 'react';
import {
  WatchSegmentTracker,
  type WatchSegment,
} from '@/modules/player/application/watch-segment-tracker';

interface WatchSegmentsOptions {
  lessonId: string;
  currentTime: number;
  isPlaying: boolean;
  playbackRate: number;
  durationSeconds: number;
  onSegment: (lessonId: string, segment: WatchSegment) => void;
}

/**
 * Liga o `WatchSegmentTracker` ao estado do player. Ao trocar de aula ou
 * desmontar, o trecho em andamento é enviado para a aula correta.
 */
export function useWatchSegments({
  lessonId,
  currentTime,
  isPlaying,
  playbackRate,
  durationSeconds,
  onSegment,
}: WatchSegmentsOptions): void {
  const onSegmentRef = useRef(onSegment);
  onSegmentRef.current = onSegment;
  const trackerRef = useRef<WatchSegmentTracker | null>(null);

  useEffect(() => {
    const tracker = new WatchSegmentTracker((segment) => onSegmentRef.current(lessonId, segment));
    trackerRef.current = tracker;
    return () => {
      tracker.flush();
      trackerRef.current = null;
    };
  }, [lessonId]);

  useEffect(() => {
    trackerRef.current?.tick(currentTime, isPlaying, playbackRate, durationSeconds);
  }, [currentTime, isPlaying, playbackRate, durationSeconds]);
}
