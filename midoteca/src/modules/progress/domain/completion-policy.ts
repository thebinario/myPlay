import type { WatchCoverage } from './watch-coverage';

/** Fraction of the media that must really be played to count as watched. */
export const WATCH_COMPLETION_THRESHOLD = 0.9;

/**
 * A lesson is watched once at least 90% of its media time was really played.
 * The threshold already absorbs intros/credits; seeking adds no coverage, so
 * jumping to the end never completes a lesson. Without a known duration the
 * lesson never completes on its own (it can still be marked manually).
 */
export function isWatchComplete(coverage: WatchCoverage, durationMs: number | null): boolean {
  const ratio = coverage.ratio(durationMs);
  return ratio !== null && ratio >= WATCH_COMPLETION_THRESHOLD - 1e-9;
}
