import { buildDayPlan } from '../../domain/day-plan';
import type { StudySession } from '../../domain/entities';
import { addDays, assertLocalDate, startOfWeek, weekdayOf } from '../../domain/local-date';
import type { StudyWeekDayView, StudyWeekView } from '../../domain/read-models';
import type { LocalDate } from '../../domain/types';
import type { StudyDependencies } from '../dependencies';
import { loadSnapshot, loggedByTrack, type StudySnapshot } from './get-study-day';

const MINUTE_MS = 60_000;
/** How far back the streak looks. */
const STREAK_WINDOW_DAYS = 120;

interface DayOutcome {
  plannedMinutes: number;
  loggedMinutes: number;
  /** Every block of the day reached its planned time. */
  met: boolean;
}

function outcomeOf(
  snapshot: StudySnapshot,
  sessions: readonly StudySession[],
  day: LocalDate,
): DayOutcome {
  const weekday = weekdayOf(day);
  const blocks = snapshot.blocks.filter((block) => block.weekday === weekday);
  const plan = buildDayPlan({
    blocks,
    loggedMsByTrack: loggedByTrack(sessions, snapshot, day),
    nowMinute: null,
  });
  return {
    plannedMinutes: plan.plannedMinutes,
    loggedMinutes: plan.loggedMinutes,
    met: blocks.length > 0 && plan.blocks.every((block) => block.status === 'done'),
  };
}

/**
 * Days in a row that met the plan, walking back from today. Days without a
 * plan neither count nor break it; today only counts once it is met.
 * Note: past days are judged against the current weekly schedule.
 */
function streakOf(snapshot: StudySnapshot, sessions: readonly StudySession[]): number {
  let streak = 0;
  for (let offset = 0; offset < STREAK_WINDOW_DAYS; offset++) {
    const day = addDays(snapshot.today, -offset);
    const outcome = outcomeOf(snapshot, sessions, day);
    if (outcome.plannedMinutes === 0) continue;
    if (outcome.met) streak++;
    else if (offset > 0) break;
  }
  return streak;
}

/** Monday–Sunday summary of planned vs. done, plus the current streak. */
export class GetStudyWeek {
  constructor(private readonly deps: StudyDependencies) {}

  async execute(input: { date?: string | null } = {}): Promise<StudyWeekView> {
    const snapshot = await loadSnapshot(this.deps);
    const reference = input?.date ? assertLocalDate(input.date, 'date') : snapshot.today;
    const from = startOfWeek(reference);
    const to = addDays(from, 6);
    const historyFrom = addDays(snapshot.today, -STREAK_WINDOW_DAYS);
    const sessions = await this.deps.repository.listSessions(
      from < historyFrom ? from : historyFrom,
      to > snapshot.today ? to : snapshot.today,
    );

    const days: StudyWeekDayView[] = Array.from({ length: 7 }, (_, index) => {
      const date = addDays(from, index);
      const outcome = outcomeOf(snapshot, sessions, date);
      const isFuture = date > snapshot.today;
      return {
        date,
        weekday: weekdayOf(date),
        isToday: date === snapshot.today,
        isFuture,
        plannedMinutes: outcome.plannedMinutes,
        loggedMinutes: outcome.loggedMinutes,
        metPlan: outcome.plannedMinutes === 0 || isFuture ? null : outcome.met,
      };
    });

    const perTrack = new Map<string, number>();
    for (const date of days.map((day) => day.date)) {
      for (const [trackId, ms] of loggedByTrack(sessions, snapshot, date)) {
        perTrack.set(trackId, (perTrack.get(trackId) ?? 0) + ms);
      }
    }

    return {
      from,
      to,
      days,
      streakDays: streakOf(snapshot, sessions),
      totalPlannedMinutes: days.reduce((sum, day) => sum + day.plannedMinutes, 0),
      totalLoggedMinutes: days.reduce((sum, day) => sum + day.loggedMinutes, 0),
      tracks: [...perTrack]
        .flatMap(([trackId, ms]) => {
          const track = snapshot.tracks.get(trackId);
          return track ? [{ track, loggedMinutes: Math.floor(ms / MINUTE_MS) }] : [];
        })
        .sort((a, b) => b.loggedMinutes - a.loggedMinutes),
    };
  }
}
