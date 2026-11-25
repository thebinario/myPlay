import type { ActiveStudyTimer, StudySession } from '../../domain/entities';
import type { NewStudySession } from '../../domain/repositories';
import { assertActivity } from '../../domain/schedule';
import { defaultActivityFor } from '../../domain/track';
import { toLocalDate } from '../../domain/local-date';
import { requireActiveTrack, type StudyDependencies } from '../dependencies';

/** Shorter runs are accidental clicks and are not logged. */
export const MIN_SESSION_MS = 60_000;
/** A stopwatch left running is capped: nobody studies 12 h straight. */
export const MAX_SESSION_MS = 12 * 60 * 60_000;

export interface StartStudyTimerInput {
  trackId: string;
  activity?: string | null;
  note?: string | null;
}

export interface StopStudyTimerInput {
  note?: string | null;
  /** Discard the running time instead of logging it. */
  discard?: boolean;
}

const cleanNote = (note: unknown) =>
  typeof note === 'string' && note.trim() ? note.trim().slice(0, 500) : null;

/** Turns the running stopwatch into a session (or nothing, if too short). */
function finish(timer: ActiveStudyTimer, end: Date, note: unknown): NewStudySession | null {
  const startedAt = new Date(timer.startedAt);
  const durationMs = Math.min(MAX_SESSION_MS, Math.max(0, end.getTime() - startedAt.getTime()));
  if (durationMs < MIN_SESSION_MS) return null;
  return {
    trackId: timer.trackId,
    day: toLocalDate(startedAt),
    startedAt: timer.startedAt,
    endedAt: new Date(startedAt.getTime() + durationMs).toISOString(),
    durationMs,
    source: 'timer',
    activity: timer.activity,
    note: cleanNote(note) ?? timer.note,
  };
}

/** Start/stop of the single stopwatch. Starting another track closes the current one. */
export class StudyTimer {
  constructor(private readonly deps: StudyDependencies) {}

  async start(input: StartStudyTimerInput): Promise<ActiveStudyTimer> {
    const track = await requireActiveTrack(this.deps.repository, input?.trackId);
    const activity =
      input.activity === undefined || input.activity === null
        ? defaultActivityFor(track.kind)
        : assertActivity(input.activity);
    const now = this.deps.clock();
    const running = await this.deps.repository.getTimer();
    const next: ActiveStudyTimer = {
      trackId: track.id,
      activity,
      startedAt: now.toISOString(),
      note: cleanNote(input.note),
    };
    await this.deps.repository.commitTimer({
      finished: running ? finish(running, now, null) : null,
      next,
    });
    return next;
  }

  async stop(input: StopStudyTimerInput = {}): Promise<StudySession | null> {
    const running = await this.deps.repository.getTimer();
    if (!running) return null;
    const finished = input.discard ? null : finish(running, this.deps.clock(), input.note);
    return this.deps.repository.commitTimer({ finished, next: null });
  }
}
