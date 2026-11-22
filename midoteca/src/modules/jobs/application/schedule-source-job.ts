import type { JsonObject } from '../../../core/json';
import type { JobRepository } from '../domain/ports';

/**
 * Enqueues a job unless an identical one (same type and payload) is already
 * pending or running.
 */
export async function scheduleJobOnce(
  jobs: JobRepository,
  type: string,
  payload: JsonObject,
  priority = -1,
): Promise<boolean> {
  const key = JSON.stringify(payload);
  const active = [...(await jobs.listByStatus('pending')), ...(await jobs.listByStatus('running'))];
  if (active.some((job) => job.type === type && JSON.stringify(job.payload ?? {}) === key)) {
    return false;
  }
  await jobs.enqueue({ type, payload, priority });
  return true;
}

/** One job of `type` per source (not one per file), deduplicated. */
export function scheduleSourceJob(
  jobs: JobRepository,
  type: string,
  sourceId: string,
  priority = -1,
): Promise<boolean> {
  return scheduleJobOnce(jobs, type, { sourceId }, priority);
}
