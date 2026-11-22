import type { JobRepository } from '../domain/ports';

/**
 * Enqueues one job of `type` for a source (not one per file). Skips when the
 * same job for that source is already pending or running.
 */
export async function scheduleSourceJob(
  jobs: JobRepository,
  type: string,
  sourceId: string,
  priority = -1,
): Promise<boolean> {
  const active = [...(await jobs.listByStatus('pending')), ...(await jobs.listByStatus('running'))];
  if (active.some((job) => job.type === type && job.payload?.sourceId === sourceId)) return false;
  await jobs.enqueue({ type, payload: { sourceId }, priority });
  return true;
}
