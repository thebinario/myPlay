import type { JsonObject } from '../../../core/json';

/**
 * Background work item (indexing, hashing, subtitle generation, ...). Phase 1
 * only persists the queue; no worker runs it yet. `payload` and `checkpoint`
 * are free-form so new job types do not require schema changes.
 */
export type JobStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

export interface Job {
  id: string;
  type: string;
  status: JobStatus;
  /** Higher value = scheduled earlier. Defaults to 0. */
  priority: number;
  payload: JsonObject | null;
  checkpoint: JsonObject | null;
  attempts: number;
  createdAt: string;
  updatedAt: string;
}

export const JOB_STATUSES: readonly JobStatus[] = [
  'pending',
  'running',
  'paused',
  'completed',
  'failed',
  'cancelled',
];
