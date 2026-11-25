import { ValidationError } from '../../../../core/errors';
import { assertFiniteNumber, assertNonEmptyString } from '../../../../core/validation';
import { isWatchComplete } from '../../domain/completion-policy';
import type { PlaybackProgress } from '../../domain/entities';
import type { RecordPlaybackSegmentInput } from '../../domain/inputs';
import { WatchCoverage } from '../../domain/watch-coverage';
import type { WatchProgressDependencies } from '../dto';
import { resolveDuration } from './resolve-duration';

/**
 * The renderer flushes a segment at least every ~10 s while playing; anything
 * much longer cannot come from continuous playback and is rejected.
 */
export const MAX_SEGMENT_MS = 120_000;

/**
 * Adds a really-played span to the lesson coverage and decides completion in
 * the backend (≥ 90% watched). A completion that already exists — manual,
 * duplicate or legacy — is never overwritten by coverage.
 */
export class RecordPlaybackSegment {
  constructor(private readonly deps: WatchProgressDependencies) {}

  async execute(input: RecordPlaybackSegmentInput): Promise<PlaybackProgress> {
    const lessonId = assertNonEmptyString(input.lessonId, 'lessonId');
    const fromMs = Math.max(0, assertFiniteNumber(input.fromMs, 'fromMs'));
    const toMs = Math.max(0, assertFiniteNumber(input.toMs, 'toMs'));
    if (Math.abs(toMs - fromMs) > MAX_SEGMENT_MS) {
      throw new ValidationError(`Playback segment must not exceed ${MAX_SEGMENT_MS} ms`);
    }

    const existing = await this.deps.progress.getPlayback(lessonId);
    const durationMs = await resolveDuration(this.deps, lessonId, input.durationMs, existing);

    let coverage = WatchCoverage.fromIntervals(existing?.watchedIntervals ?? []).add(fromMs, toMs);
    if (durationMs !== null) coverage = coverage.clampTo(durationMs);

    const alreadyCompleted = existing?.completedAt ?? null;
    const completedNow = !alreadyCompleted && isWatchComplete(coverage, durationMs);

    const saved = await this.deps.progress.saveWatchState({
      lessonId,
      positionMs: Math.max(fromMs, toMs),
      durationMs,
      watchedIntervals: coverage.intervals,
      completedAt: alreadyCompleted ?? (completedNow ? this.deps.now() : null),
      completionSource: alreadyCompleted
        ? (existing?.completionSource ?? null)
        : completedNow
          ? 'watched'
          : null,
    });
    await this.notifyPlayed(lessonId, toMs - fromMs);
    return saved;
  }

  private async notifyPlayed(lessonId: string, playedMs: number): Promise<void> {
    if (!this.deps.activity || playedMs <= 0) return;
    try {
      await this.deps.activity.segmentPlayed({ lessonId, playedMs });
    } catch (error) {
      console.error('[progress] falha ao registrar tempo de estudo', error);
    }
  }
}
