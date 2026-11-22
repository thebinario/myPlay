import { ValidationError } from '../../../../core/errors';
import { assertNonEmptyString } from '../../../../core/validation';
import type { PlaybackProgress } from '../../../progress/domain/entities';
import type { ProgressRepository } from '../../../progress/domain/ports';
import type { DuplicateReadStore } from '../../domain/analysis';
import { groupDuplicates } from '../../domain/duplicate-detection';

export interface MarkDuplicateAsWatchedInput {
  /** Lesson to complete. */
  lessonId: string;
  /** Already-completed lesson that plays the same content. */
  fromLessonId: string;
}

export interface MarkDuplicateAsWatchedDependencies {
  reads: DuplicateReadStore;
  progress: ProgressRepository;
  now: () => string;
}

/**
 * Explicit, person-driven reuse of a completion between two lessons that play
 * the same content (exact or perceptual duplicate). Never automatic.
 */
export class MarkDuplicateAsWatched {
  constructor(private readonly deps: MarkDuplicateAsWatchedDependencies) {}

  async execute(input: MarkDuplicateAsWatchedInput): Promise<PlaybackProgress> {
    const lessonId = assertNonEmptyString(input.lessonId, 'lessonId');
    const fromLessonId = assertNonEmptyString(input.fromLessonId, 'fromLessonId');

    const [target, source] = await Promise.all([
      this.deps.reads.primaryMediaOf(lessonId),
      this.deps.reads.primaryMediaOf(fromLessonId),
    ]);
    if (!target || !source || !(await this.sameGroup(target, source))) {
      throw new ValidationError('Lessons do not play duplicate content');
    }

    const from = await this.deps.progress.getPlayback(fromLessonId);
    if (!from?.completedAt) {
      throw new ValidationError('The duplicate lesson was not watched yet');
    }

    const existing = await this.deps.progress.getPlayback(lessonId);
    if (existing?.completedAt) return existing;
    return this.deps.progress.saveWatchState({
      lessonId,
      positionMs: existing?.positionMs ?? 0,
      durationMs: existing?.durationMs ?? from.durationMs,
      watchedIntervals: existing?.watchedIntervals ?? [],
      completedAt: this.deps.now(),
      completionSource: 'duplicate',
    });
  }

  private async sameGroup(a: string, b: string): Promise<boolean> {
    if (a === b) return true;
    const groups = groupDuplicates(
      await this.deps.reads.listHashed(),
      await this.deps.reads.listLinks(),
    );
    return groups.some((group) => group.mediaFileIds.includes(a) && group.mediaFileIds.includes(b));
  }
}
