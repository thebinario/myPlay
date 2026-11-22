import { assertNonEmptyString, assertNonNegativeNumber } from '../../../../core/validation';
import type { PlaybackProgress } from '../../domain/entities';
import type { SavePlaybackPositionInput } from '../../domain/inputs';
import type { WatchProgressDependencies } from '../dto';
import { resolveDuration } from './resolve-duration';

/**
 * Stores where to resume. It never changes coverage or completion: those are
 * decided only by `RecordPlaybackSegment` and `SetLessonCompletion`.
 */
export class SavePlaybackPosition {
  constructor(private readonly deps: WatchProgressDependencies) {}

  async execute(input: SavePlaybackPositionInput): Promise<PlaybackProgress> {
    const lessonId = assertNonEmptyString(input.lessonId, 'lessonId');
    const positionMs = assertNonNegativeNumber(input.positionMs, 'positionMs');
    const existing = await this.deps.progress.getPlayback(lessonId);

    return this.deps.progress.saveWatchState({
      lessonId,
      positionMs,
      durationMs: await resolveDuration(this.deps, lessonId, input.durationMs, existing),
      watchedIntervals: existing?.watchedIntervals ?? [],
      completedAt: existing?.completedAt ?? null,
      completionSource: existing?.completionSource ?? null,
    });
  }
}
