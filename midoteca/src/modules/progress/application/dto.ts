import type {
  LessonMediaDurations,
  PlaybackActivityObserver,
  ProgressRepository,
} from '../domain/ports';

export interface WatchProgressDependencies {
  progress: ProgressRepository;
  durations: LessonMediaDurations;
  /** ISO clock, injectable for deterministic tests. */
  now: () => string;
  /** Optional listener of played time (study planner). */
  activity?: PlaybackActivityObserver;
}
