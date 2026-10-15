/**
 * Playback progress is keyed by *lesson*, not by media file. Re-encodes,
 * remounts or file moves therefore never lose the user's position.
 */
export interface PlaybackProgress {
  id: string;
  lessonId: string;
  /** Current playback position in milliseconds. */
  positionMs: number;
  /** Total duration in milliseconds, when known. */
  durationMs: number | null;
  /** Set when the lesson is marked complete; null while in progress. */
  completedAt: string | null;
  updatedAt: string;
}

/**
 * Reading progress for a document, including viewport state so reopening a PDF
 * restores page, scroll position and zoom.
 */
export interface ReadingProgress {
  id: string;
  documentId: string;
  /** 1-based current page. */
  page: number;
  /** Normalized scroll offset within the page, 0..1. */
  scrollRatio: number;
  /** Zoom factor, e.g. 1 = 100%. */
  zoom: number;
  /** Reader theme preference (e.g. `dark` | `original`). */
  theme: string | null;
  /** View mode preference (e.g. `paged` | `continuous`). */
  viewMode: string | null;
  /** Set when the document is marked fully read; null while in progress. */
  completedAt: string | null;
  updatedAt: string;
}
