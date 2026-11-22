import type { LessonMediaDurations, ProgressRepository } from '../domain/ports';

export interface WatchProgressDependencies {
  progress: ProgressRepository;
  durations: LessonMediaDurations;
  /** ISO clock, injectable for deterministic tests. */
  now: () => string;
}
