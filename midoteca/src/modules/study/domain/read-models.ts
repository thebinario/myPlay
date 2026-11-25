import type { NextLesson } from './contracts';
import type { StudyFocus } from './day-plan';
import type { ActiveStudyTimer, StudyBlock, StudySession, StudyTrack } from './entities';
import type { LocalDate, PlannedBlockStatus } from './types';

export interface ActiveStudyTimerView extends ActiveStudyTimer {
  track: StudyTrack;
  /** Elapsed time when the read model was built. */
  elapsedMs: number;
}

export interface PlannedBlockView {
  block: StudyBlock;
  track: StudyTrack;
  endMinute: number;
  status: PlannedBlockStatus;
  loggedMinutes: number;
  remainingMinutes: number;
  progressPercent: number;
  /** For course tracks: where to continue. */
  nextLesson: NextLesson | null;
}

export interface StudySessionView extends StudySession {
  track: StudyTrack;
}

export interface TrackTimeView {
  track: StudyTrack;
  loggedMinutes: number;
  plannedMinutes: number;
}

/** One day of the planner: what was planned, what was done and what to do now. */
export interface StudyDayView {
  date: LocalDate;
  weekday: number;
  isToday: boolean;
  /** Minute of day for today; null for other days. */
  nowMinute: number | null;
  blocks: PlannedBlockView[];
  /** Only for today. */
  focus: StudyFocus | null;
  plannedMinutes: number;
  loggedMinutes: number;
  progressPercent: number;
  /** Time per track on the day, planned or not (most studied first). */
  tracks: TrackTimeView[];
  sessions: StudySessionView[];
  timer: ActiveStudyTimerView | null;
}

export interface StudyWeekDayView {
  date: LocalDate;
  weekday: number;
  isToday: boolean;
  isFuture: boolean;
  plannedMinutes: number;
  loggedMinutes: number;
  /** null when nothing was planned for the day. */
  metPlan: boolean | null;
}

export interface StudyWeekView {
  from: LocalDate;
  to: LocalDate;
  days: StudyWeekDayView[];
  /** Planned days met in a row, up to today (today only counts once met). */
  streakDays: number;
  totalPlannedMinutes: number;
  totalLoggedMinutes: number;
  tracks: Array<{ track: StudyTrack; loggedMinutes: number }>;
}
