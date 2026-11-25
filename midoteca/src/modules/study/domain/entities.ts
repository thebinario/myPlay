import type { LocalDate, StudyActivity, StudySessionSource, StudyTrackKind } from './types';

/** Something the user studies: a library course, Hack The Box, HackingClub... */
export interface StudyTrack {
  id: string;
  title: string;
  kind: StudyTrackKind;
  /** Library course, when `kind === 'course'` and the track covers one course. */
  courseId: string | null;
  /** Library (source), when `kind === 'course'` and the track covers all its courses. */
  sourceId: string | null;
  /** External platform name, when `kind === 'external'`. */
  platform: string | null;
  url: string | null;
  /** `#RRGGBB`, used to tell tracks apart in the schedule. */
  color: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A recurring weekly slot of the schedule (cronograma). */
export interface StudyBlock {
  id: string;
  trackId: string;
  /** 0 = domingo … 6 = sábado. */
  weekday: number;
  /** Minutes since local midnight. */
  startMinute: number;
  durationMinutes: number;
  /** What to do in the slot ("Máquina Easy", "Módulo 3"). */
  focus: string | null;
  activity: StudyActivity | null;
}

/** Time actually spent studying a track on a day. */
export interface StudySession {
  id: string;
  trackId: string;
  day: LocalDate;
  startedAt: string | null;
  endedAt: string | null;
  durationMs: number;
  source: StudySessionSource;
  activity: StudyActivity;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

/** The running stopwatch (at most one). Persisted, so it survives restarts. */
export interface ActiveStudyTimer {
  trackId: string;
  activity: StudyActivity;
  startedAt: string;
  note: string | null;
}
