import type { PlannedBlockStatus, StudyFocusKind } from './types';

const MINUTE_MS = 60_000;

export interface PlanBlockInput {
  id: string;
  trackId: string;
  startMinute: number;
  durationMinutes: number;
}

export interface PlanInput {
  /** Blocks of the day, any order. */
  blocks: readonly PlanBlockInput[];
  /** Time logged on the day per track (sessions + running timer). */
  loggedMsByTrack: ReadonlyMap<string, number>;
  /** Minute of day when the plan is for today; `null` for any other day. */
  nowMinute: number | null;
  /** The day is after today (nothing can be missed yet). */
  future?: boolean;
}

export interface PlannedBlockProgress {
  blockId: string;
  status: PlannedBlockStatus;
  loggedMinutes: number;
  remainingMinutes: number;
  progressPercent: number;
}

export interface StudyFocus {
  kind: StudyFocusKind;
  blockId: string | null;
  /** Minutes still missing in the focused block. */
  remainingMinutes: number;
  /** For `next`: minutes until the block starts. */
  startsInMinutes: number | null;
}

export interface DayPlan {
  blocks: PlannedBlockProgress[];
  /** Only for today. */
  focus: StudyFocus | null;
  plannedMinutes: number;
  loggedMinutes: number;
  /** Planned time covered (0–100); extra time does not go over 100. */
  progressPercent: number;
}

const toMinutes = (ms: number) => Math.floor(ms / MINUTE_MS);
const percent = (part: number, total: number) =>
  total <= 0 ? 0 : Math.min(100, Math.round((part / total) * 100));

function statusOf(
  block: PlanBlockInput,
  allocatedMs: number,
  nowMinute: number | null,
  future: boolean,
): PlannedBlockStatus {
  if (allocatedMs >= block.durationMinutes * MINUTE_MS) return 'done';
  if (future) return 'upcoming';
  if (nowMinute === null) return 'missed';
  if (nowMinute < block.startMinute) return 'upcoming';
  if (nowMinute < block.startMinute + block.durationMinutes) return 'now';
  return 'missed';
}

function pickFocus(
  ordered: readonly PlanBlockInput[],
  progress: readonly PlannedBlockProgress[],
  nowMinute: number,
): StudyFocus {
  const focus = (kind: StudyFocusKind, index: number | null, startsIn: number | null = null) => ({
    kind,
    blockId: index === null ? null : ordered[index].id,
    remainingMinutes: index === null ? 0 : progress[index].remainingMinutes,
    startsInMinutes: startsIn,
  });
  if (ordered.length === 0) return focus('free', null);
  const byStatus = (status: PlannedBlockStatus) => progress.findIndex((p) => p.status === status);
  const now = byStatus('now');
  if (now >= 0) return focus('now', now);
  const missed = byStatus('missed');
  if (missed >= 0) return focus('catch-up', missed);
  const next = byStatus('upcoming');
  if (next >= 0) return focus('next', next, ordered[next].startMinute - nowMinute);
  return focus('done', null);
}

/**
 * Decides, for one day, how far each planned block got and what to study now.
 * Time logged for a track fills that track's blocks in chronological order, so
 * studying ahead of time (or on another device, logged manually) still counts.
 */
export function buildDayPlan(input: PlanInput): DayPlan {
  const ordered = [...input.blocks].sort((a, b) => a.startMinute - b.startMinute);
  const remainingByTrack = new Map(input.loggedMsByTrack);

  const blocks = ordered.map((block) => {
    const durationMs = block.durationMinutes * MINUTE_MS;
    const available = remainingByTrack.get(block.trackId) ?? 0;
    const allocatedMs = Math.min(available, durationMs);
    remainingByTrack.set(block.trackId, available - allocatedMs);
    const loggedMinutes = toMinutes(allocatedMs);
    return {
      blockId: block.id,
      status: statusOf(block, allocatedMs, input.nowMinute, input.future === true),
      loggedMinutes,
      remainingMinutes: Math.max(0, Math.ceil((durationMs - allocatedMs) / MINUTE_MS)),
      progressPercent: percent(allocatedMs, durationMs),
      allocatedMs,
    };
  });

  const plannedMs = ordered.reduce((sum, block) => sum + block.durationMinutes * MINUTE_MS, 0);
  const coveredMs = blocks.reduce((sum, block) => sum + block.allocatedMs, 0);
  const loggedMs = [...input.loggedMsByTrack.values()].reduce((sum, ms) => sum + ms, 0);
  const progress = blocks.map(({ allocatedMs: _allocated, ...rest }) => rest);

  return {
    blocks: progress,
    focus: input.nowMinute === null ? null : pickFocus(ordered, progress, input.nowMinute),
    plannedMinutes: toMinutes(plannedMs),
    loggedMinutes: toMinutes(loggedMs),
    progressPercent: percent(coveredMs, plannedMs),
  };
}
