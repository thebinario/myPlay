import { describe, expect, it } from 'vitest';
import { WatchCoverage } from '../../../../src/modules/progress/domain/watch-coverage';
import { isWatchComplete } from '../../../../src/modules/progress/domain/completion-policy';

describe('WatchCoverage', () => {
  it('starts empty', () => {
    const coverage = WatchCoverage.empty();
    expect(coverage.intervals).toEqual([]);
    expect(coverage.watchedMs).toBe(0);
  });

  it('merges overlapping and adjacent segments', () => {
    const coverage = WatchCoverage.empty()
      .add(0, 10_000)
      .add(5_000, 20_000)
      .add(20_500, 30_000) // within merge tolerance (timeupdate granularity)
      .add(60_000, 70_000);

    expect(coverage.intervals).toEqual([
      { fromMs: 0, toMs: 30_000 },
      { fromMs: 60_000, toMs: 70_000 },
    ]);
    expect(coverage.watchedMs).toBe(40_000);
  });

  it('does not count the same span twice when rewatched', () => {
    const coverage = WatchCoverage.empty().add(0, 10_000).add(0, 10_000).add(2_000, 8_000);
    expect(coverage.watchedMs).toBe(10_000);
  });

  it('normalizes inverted segments and ignores empty ones', () => {
    const coverage = WatchCoverage.empty().add(10_000, 5_000).add(7_000, 7_000);
    expect(coverage.intervals).toEqual([{ fromMs: 5_000, toMs: 10_000 }]);
  });

  it('clamps negative positions to zero', () => {
    expect(WatchCoverage.empty().add(-500, 1_000).intervals).toEqual([{ fromMs: 0, toMs: 1_000 }]);
  });

  it('clamps to the media duration', () => {
    const coverage = WatchCoverage.empty().add(50_000, 70_000).add(80_000, 90_000).clampTo(60_000);
    expect(coverage.intervals).toEqual([{ fromMs: 50_000, toMs: 60_000 }]);
  });

  it('computes the watched ratio against the duration', () => {
    const coverage = WatchCoverage.empty().add(0, 30_000);
    expect(coverage.ratio(60_000)).toBe(0.5);
    expect(coverage.ratio(null)).toBeNull();
    expect(coverage.ratio(0)).toBeNull();
  });

  it('round-trips through its serialized intervals', () => {
    const original = WatchCoverage.empty().add(0, 1_000).add(5_000, 9_000);
    const restored = WatchCoverage.fromIntervals(original.intervals);
    expect(restored.intervals).toEqual(original.intervals);
  });

  it('is immutable', () => {
    const base = WatchCoverage.empty();
    base.add(0, 1_000);
    expect(base.watchedMs).toBe(0);
  });
});

describe('completion policy', () => {
  const minute = 60_000;

  it('completes when at least 90% of the media was really played', () => {
    expect(isWatchComplete(WatchCoverage.empty().add(0, 9 * minute), 10 * minute)).toBe(true);
    expect(isWatchComplete(WatchCoverage.empty().add(0, 8.9 * minute), 10 * minute)).toBe(false);
  });

  it('does not complete when the user seeks to the end without watching', () => {
    const coverage = WatchCoverage.empty()
      .add(0, 30_000)
      .add(10 * minute - 5_000, 10 * minute);
    expect(isWatchComplete(coverage, 10 * minute)).toBe(false);
  });

  it('counts watched spans in any order (skipped intro, watched the rest)', () => {
    const coverage = WatchCoverage.empty()
      .add(5 * minute, 10 * minute)
      .add(30_000, 5 * minute);
    expect(isWatchComplete(coverage, 10 * minute)).toBe(true);
  });

  it('never completes on its own when the duration is unknown', () => {
    expect(isWatchComplete(WatchCoverage.empty().add(0, 99 * minute), null)).toBe(false);
  });
});
