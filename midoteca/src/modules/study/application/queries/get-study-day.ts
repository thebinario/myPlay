import { NotFoundError } from '../../../../core/errors';
import { buildDayPlan } from '../../domain/day-plan';
import type { ActiveStudyTimer, StudyBlock, StudySession, StudyTrack } from '../../domain/entities';
import { assertLocalDate, minuteOfDay, toLocalDate, weekdayOf } from '../../domain/local-date';
import type { PlannedBlockView, StudyDayView, TrackTimeView } from '../../domain/read-models';
import type { LocalDate } from '../../domain/types';
import type { StudyDependencies } from '../dependencies';

const MINUTE_MS = 60_000;

/** Snapshot shared by the day and week queries. */
export interface StudySnapshot {
  today: LocalDate;
  now: Date;
  tracks: Map<string, StudyTrack>;
  blocks: StudyBlock[];
  timer: ActiveStudyTimer | null;
}

export async function loadSnapshot(deps: StudyDependencies): Promise<StudySnapshot> {
  const now = deps.clock();
  const [tracks, blocks, timer] = await Promise.all([
    deps.repository.listTracks({ includeArchived: true }),
    deps.repository.listBlocks(),
    deps.repository.getTimer(),
  ]);
  return {
    today: toLocalDate(now),
    now,
    tracks: new Map(tracks.map((track) => [track.id, track])),
    blocks,
    timer,
  };
}

export function timerElapsedMs(timer: ActiveStudyTimer, now: Date): number {
  return Math.max(0, now.getTime() - new Date(timer.startedAt).getTime());
}

/** Time per track on a day: sessions plus the running stopwatch of that day. */
export function loggedByTrack(
  sessions: readonly StudySession[],
  snapshot: StudySnapshot,
  day: LocalDate,
): Map<string, number> {
  const logged = new Map<string, number>();
  const add = (trackId: string, ms: number) => logged.set(trackId, (logged.get(trackId) ?? 0) + ms);
  for (const session of sessions) if (session.day === day) add(session.trackId, session.durationMs);
  const { timer } = snapshot;
  if (timer && toLocalDate(new Date(timer.startedAt)) === day) {
    add(timer.trackId, timerElapsedMs(timer, snapshot.now));
  }
  return logged;
}

function requireTrack(tracks: Map<string, StudyTrack>, id: string): StudyTrack {
  const track = tracks.get(id);
  if (!track) throw new NotFoundError(`Trilha ${id} não encontrada`);
  return track;
}

/** One day of the planner, including the "o que estudar agora" answer for today. */
export class GetStudyDay {
  constructor(private readonly deps: StudyDependencies) {}

  async execute(input: { date?: string | null } = {}): Promise<StudyDayView> {
    const snapshot = await loadSnapshot(this.deps);
    const date = input?.date ? assertLocalDate(input.date, 'date') : snapshot.today;
    const weekday = weekdayOf(date);
    const isToday = date === snapshot.today;
    const blocks = snapshot.blocks.filter((block) => block.weekday === weekday);
    const sessions = await this.deps.repository.listSessions(date, date);
    const logged = loggedByTrack(sessions, snapshot, date);
    const nowMinute = isToday ? minuteOfDay(snapshot.now) : null;
    const plan = buildDayPlan({
      blocks,
      loggedMsByTrack: logged,
      nowMinute,
      future: date > snapshot.today,
    });

    const planned: PlannedBlockView[] = await Promise.all(
      blocks.map(async (block, index) => {
        const track = requireTrack(snapshot.tracks, block.trackId);
        const progress =
          plan.blocks.find((item) => item.blockId === block.id) ?? plan.blocks[index];
        return {
          block,
          track,
          endMinute: block.startMinute + block.durationMinutes,
          status: progress.status,
          loggedMinutes: progress.loggedMinutes,
          remainingMinutes: progress.remainingMinutes,
          progressPercent: progress.progressPercent,
          nextLesson: await this.nextLessonOf(track),
        };
      }),
    );

    const timer = snapshot.timer;
    return {
      date,
      weekday,
      isToday,
      nowMinute,
      blocks: planned,
      focus: plan.focus,
      plannedMinutes: plan.plannedMinutes,
      loggedMinutes: plan.loggedMinutes,
      progressPercent: plan.progressPercent,
      tracks: this.trackTotals(snapshot, blocks, logged),
      sessions: sessions.map((session) => ({
        ...session,
        track: requireTrack(snapshot.tracks, session.trackId),
      })),
      timer: timer
        ? {
            ...timer,
            track: requireTrack(snapshot.tracks, timer.trackId),
            elapsedMs: timerElapsedMs(timer, snapshot.now),
          }
        : null,
    };
  }

  /** Where to continue: the course of the track, or the library's current course. */
  private nextLessonOf(track: StudyTrack) {
    if (track.courseId) return this.deps.catalog.nextLesson(track.courseId);
    if (track.sourceId) return this.deps.catalog.nextLessonInLibrary(track.sourceId);
    return Promise.resolve(null);
  }

  private trackTotals(
    snapshot: StudySnapshot,
    blocks: readonly StudyBlock[],
    logged: Map<string, number>,
  ): TrackTimeView[] {
    const planned = new Map<string, number>();
    for (const block of blocks) {
      planned.set(block.trackId, (planned.get(block.trackId) ?? 0) + block.durationMinutes);
    }
    const ids = new Set([...planned.keys(), ...logged.keys()]);
    return [...ids]
      .map((id) => ({
        track: requireTrack(snapshot.tracks, id),
        loggedMinutes: Math.floor((logged.get(id) ?? 0) / MINUTE_MS),
        plannedMinutes: planned.get(id) ?? 0,
      }))
      .sort((a, b) => b.loggedMinutes - a.loggedMinutes || b.plannedMinutes - a.plannedMinutes);
  }
}
