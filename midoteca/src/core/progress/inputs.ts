export interface SavePlaybackProgress {
  /** Callers may provide a UUID; otherwise the existing row id is reused. */
  id?: string;
  lessonId: string;
  positionMs: number;
  durationMs?: number | null;
  /** Pass an ISO string to mark completed, or null/undefined to clear it. */
  completedAt?: string | null;
}

export interface SaveReadingProgress {
  id?: string;
  documentId: string;
  page: number;
  scrollRatio: number;
  zoom: number;
  theme?: string | null;
}
