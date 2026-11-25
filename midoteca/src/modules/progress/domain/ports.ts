import type { PlaybackProgress, ReadingProgress } from './entities';
import type { SavePlaybackProgress, SaveReadingProgress, SaveWatchState } from './inputs';

export interface ProgressRepository {
  /** Upsert semantics: one row per lesson. Leaves the watch coverage untouched. */
  savePlayback(input: SavePlaybackProgress): Promise<PlaybackProgress>;
  /** Upsert of the full playback state, including coverage and completion. */
  saveWatchState(input: SaveWatchState): Promise<PlaybackProgress>;
  getPlayback(lessonId: string): Promise<PlaybackProgress | null>;

  /** Upsert semantics: one row per document. */
  saveReading(input: SaveReadingProgress): Promise<ReadingProgress>;
  getReading(documentId: string): Promise<ReadingProgress | null>;
}

/** Read access to the catalogued duration of a lesson's primary media. */
export interface LessonMediaDurations {
  primaryDurationMs(lessonId: string): Promise<number | null>;
}

/**
 * Notified after a really-played segment is recorded (e.g. to credit study
 * time). Failures never affect the watch progress.
 */
export interface PlaybackActivityObserver {
  segmentPlayed(input: { lessonId: string; playedMs: number }): Promise<void>;
}
