import { newId } from '../../../../core/ids';
import type { StudyTrack } from '../../domain/entities';
import { toLocalDate } from '../../domain/local-date';
import { nextTrackColor, type StudyDependencies } from '../dependencies';

export interface RecordPlayerTimeInput {
  lessonId: string;
  /** Media time really played in the segment. */
  playedMs: number;
}

/**
 * Credits time watched in the course player to the course track of the day,
 * creating (or restoring) that track on first use. While the stopwatch runs it
 * already counts the same wall time, so player time is not added twice.
 */
export class RecordPlayerTime {
  constructor(private readonly deps: StudyDependencies) {}

  async execute(input: RecordPlayerTimeInput): Promise<void> {
    if (!(input.playedMs > 0)) return;
    if (await this.deps.repository.getTimer()) return;
    const course = await this.deps.catalog.courseOfLesson(input.lessonId);
    if (!course) return;

    const now = this.deps.clock();
    const track = await this.trackFor(course, now.toISOString());
    await this.deps.repository.addPlayerTime({
      trackId: track.id,
      day: toLocalDate(now),
      ms: Math.round(input.playedMs),
      at: now.toISOString(),
    });
  }

  private async trackFor(course: { courseId: string; title: string }, now: string) {
    const existing = await this.deps.repository.findTrackByCourse(course.courseId);
    if (existing && !existing.archivedAt) return existing;
    if (existing) {
      return this.deps.repository.saveTrack({ ...existing, archivedAt: null, updatedAt: now });
    }
    const track: StudyTrack = {
      id: newId(),
      title: course.title.slice(0, 80),
      kind: 'course',
      courseId: course.courseId,
      platform: null,
      url: null,
      color: await nextTrackColor(this.deps.repository),
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    return this.deps.repository.saveTrack(track);
  }
}
