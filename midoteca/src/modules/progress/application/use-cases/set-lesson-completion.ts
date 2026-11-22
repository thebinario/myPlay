import { assertNonEmptyString } from '../../../../core/validation';
import type { PlaybackProgress } from '../../domain/entities';
import type { SetLessonCompletionInput } from '../../domain/inputs';
import type { WatchProgressDependencies } from '../dto';

/**
 * Explicit, person-driven completion toggle. Marking keeps an existing
 * completion (and its source); unmarking clears it but keeps the coverage.
 */
export class SetLessonCompletion {
  constructor(private readonly deps: WatchProgressDependencies) {}

  async execute(input: SetLessonCompletionInput): Promise<PlaybackProgress> {
    const lessonId = assertNonEmptyString(input.lessonId, 'lessonId');
    const existing = await this.deps.progress.getPlayback(lessonId);
    const keepExisting = input.completed && existing?.completedAt;

    return this.deps.progress.saveWatchState({
      lessonId,
      positionMs: existing?.positionMs ?? 0,
      durationMs: existing?.durationMs ?? null,
      watchedIntervals: existing?.watchedIntervals ?? [],
      completedAt: keepExisting ? existing.completedAt : input.completed ? this.deps.now() : null,
      completionSource: keepExisting
        ? existing.completionSource
        : input.completed
          ? 'manual'
          : null,
    });
  }
}
