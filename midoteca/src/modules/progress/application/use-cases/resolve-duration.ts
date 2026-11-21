import type { PlaybackProgress } from '../../domain/entities';
import type { WatchProgressDependencies } from '../dto';

/**
 * Duration source of truth: the catalogued (probed) media duration, then the
 * one reported by the player, then whatever was stored before.
 */
export async function resolveDuration(
  deps: WatchProgressDependencies,
  lessonId: string,
  reportedMs: number | null | undefined,
  existing: PlaybackProgress | null,
): Promise<number | null> {
  const catalogued = await deps.durations.primaryDurationMs(lessonId);
  if (catalogued !== null) return catalogued;
  if (typeof reportedMs === 'number' && Number.isFinite(reportedMs) && reportedMs > 0) {
    return Math.round(reportedMs);
  }
  return existing?.durationMs ?? null;
}
