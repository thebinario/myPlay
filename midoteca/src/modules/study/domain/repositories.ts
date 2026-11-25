import type { ActiveStudyTimer, StudyBlock, StudySession, StudyTrack } from './entities';
import type { ValidatedBlock } from './schedule';
import type { LocalDate } from './types';

export type NewStudySession = Omit<StudySession, 'id' | 'createdAt' | 'updatedAt'>;

/** Atomic change of the stopwatch: close the running session and/or start another. */
export interface TimerChange {
  finished: NewStudySession | null;
  next: ActiveStudyTimer | null;
}

export interface AddPlayerTime {
  trackId: string;
  day: LocalDate;
  ms: number;
  at: string;
}

/** Persistence of the study planner aggregate (tracks, schedule, time log, timer). */
export interface StudyRepository {
  listTracks(options: { includeArchived: boolean }): Promise<StudyTrack[]>;
  findTrack(id: string): Promise<StudyTrack | null>;
  /** The active track of a course, else the latest archived one. */
  findTrackByCourse(courseId: string): Promise<StudyTrack | null>;
  /** The active track of a library, else the latest archived one. */
  findTrackBySource(sourceId: string): Promise<StudyTrack | null>;
  /** Upsert by id. */
  saveTrack(track: StudyTrack): Promise<StudyTrack>;
  /** Archives the track and removes its blocks from the schedule (one transaction). */
  archiveTrack(id: string, at: string): Promise<void>;

  listBlocks(): Promise<StudyBlock[]>;
  /** Replaces the whole weekly schedule atomically. */
  replaceSchedule(blocks: readonly ValidatedBlock[]): Promise<StudyBlock[]>;

  insertSession(session: NewStudySession): Promise<StudySession>;
  /** Adds played time to the per-day player row of the track (upsert). */
  addPlayerTime(input: AddPlayerTime): Promise<void>;
  deleteSession(id: string): Promise<boolean>;
  /** Sessions with `from <= day <= to`, chronological. */
  listSessions(from: LocalDate, to: LocalDate): Promise<StudySession[]>;

  getTimer(): Promise<ActiveStudyTimer | null>;
  commitTimer(change: TimerChange): Promise<StudySession | null>;
}
