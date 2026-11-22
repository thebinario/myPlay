/** A span of media time, in milliseconds, that was really played. */
export interface WatchInterval {
  fromMs: number;
  toMs: number;
}

/**
 * Spans closer than this are joined. It absorbs the granularity of media
 * `timeupdate` events (~250 ms) and the boundaries between reported segments,
 * so continuous playback becomes one interval.
 */
export const WATCH_MERGE_TOLERANCE_MS = 1_000;

function normalize(intervals: readonly WatchInterval[]): WatchInterval[] {
  const sorted = intervals
    .map(({ fromMs, toMs }) => ({
      fromMs: Math.max(0, Math.min(fromMs, toMs)),
      toMs: Math.max(0, Math.max(fromMs, toMs)),
    }))
    .filter((interval) => interval.toMs > interval.fromMs)
    .sort((a, b) => a.fromMs - b.fromMs);

  const merged: WatchInterval[] = [];
  for (const interval of sorted) {
    const last = merged[merged.length - 1];
    if (last && interval.fromMs <= last.toMs + WATCH_MERGE_TOLERANCE_MS) {
      last.toMs = Math.max(last.toMs, interval.toMs);
    } else {
      merged.push({ ...interval });
    }
  }
  return merged;
}

/**
 * Immutable set of media spans the person actually played. Seeking never adds
 * coverage: only segments reported while playing do. Rewatching a span does
 * not count twice, and playback speed is irrelevant (coverage is media time).
 */
export class WatchCoverage {
  private constructor(private readonly spans: readonly WatchInterval[]) {}

  static empty(): WatchCoverage {
    return new WatchCoverage([]);
  }

  static fromIntervals(intervals: readonly WatchInterval[]): WatchCoverage {
    return new WatchCoverage(normalize(intervals));
  }

  get intervals(): WatchInterval[] {
    return this.spans.map((interval) => ({ ...interval }));
  }

  get watchedMs(): number {
    return this.spans.reduce((total, { fromMs, toMs }) => total + (toMs - fromMs), 0);
  }

  add(fromMs: number, toMs: number): WatchCoverage {
    return new WatchCoverage(normalize([...this.spans, { fromMs, toMs }]));
  }

  /** Drops whatever lies beyond the media duration. */
  clampTo(durationMs: number): WatchCoverage {
    return new WatchCoverage(
      normalize(
        this.spans.map(({ fromMs, toMs }) => ({
          fromMs: Math.min(fromMs, durationMs),
          toMs: Math.min(toMs, durationMs),
        })),
      ),
    );
  }

  /** Watched fraction (0..1), or null while the duration is unknown. */
  ratio(durationMs: number | null): number | null {
    if (durationMs === null || durationMs <= 0) return null;
    return Math.min(1, this.clampTo(durationMs).watchedMs / durationMs);
  }
}
