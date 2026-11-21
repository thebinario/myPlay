import type { CompletionSource } from './entities';
import type { WatchInterval } from './watch-coverage';

export interface SavePlaybackProgress {
  /** Callers may provide a UUID; otherwise the existing row id is reused. */
  id?: string;
  lessonId: string;
  positionMs: number;
  durationMs?: number | null;
  /** Pass an ISO string to mark completed, or null/undefined to clear it. */
  completedAt?: string | null;
  /** Origin of the completion; defaults to `manual` when completedAt is set. */
  completionSource?: CompletionSource | null;
}

/** Full playback state written by the progress use cases. */
export interface SaveWatchState {
  lessonId: string;
  positionMs: number;
  durationMs: number | null;
  watchedIntervals: WatchInterval[];
  completedAt: string | null;
  completionSource: CompletionSource | null;
}

/** A span the renderer reports while the media was playing. */
export interface RecordPlaybackSegmentInput {
  lessonId: string;
  fromMs: number;
  toMs: number;
  /** Duration reported by the player; the catalogued duration wins. */
  durationMs?: number | null;
}

export interface SetLessonCompletionInput {
  lessonId: string;
  completed: boolean;
}

export interface SavePlaybackPositionInput {
  lessonId: string;
  positionMs: number;
  durationMs?: number | null;
}

export interface SaveReadingProgress {
  id?: string;
  documentId: string;
  page: number;
  scrollRatio: number;
  zoom: number;
  theme?: string | null;
  viewMode?: string | null;
  /** Pass an ISO string to mark completed, or null/undefined to clear it. */
  completedAt?: string | null;
}
