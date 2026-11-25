/** What a study track points at: a library course, an external platform or anything else. */
export const STUDY_TRACK_KINDS = ['course', 'external', 'other'] as const;
export type StudyTrackKind = (typeof STUDY_TRACK_KINDS)[number];

/** What was done in a block or session (aula, lab, leitura...). */
export const STUDY_ACTIVITIES = [
  'lesson',
  'lab',
  'reading',
  'practice',
  'review',
  'other',
] as const;
export type StudyActivity = (typeof STUDY_ACTIVITIES)[number];

/** How a session entered the log. */
export type StudySessionSource = 'timer' | 'manual' | 'player';

/** Status of a planned block on a given day, decided by `buildDayPlan`. */
export type PlannedBlockStatus = 'done' | 'now' | 'upcoming' | 'missed';

/**
 * The single answer to "o que eu estudo agora?":
 * - `now`: a block is happening right now;
 * - `catch-up`: nothing now, but an earlier block today is unfinished;
 * - `next`: everything so far is done, the next block comes later today;
 * - `done`: every block of the day is done;
 * - `free`: no block planned for today.
 */
export type StudyFocusKind = 'now' | 'catch-up' | 'next' | 'done' | 'free';

/** Local calendar date, `YYYY-MM-DD`. */
export type LocalDate = string;

/** Local clock of the machine running the core (the user's desk). */
export type StudyClock = () => Date;
