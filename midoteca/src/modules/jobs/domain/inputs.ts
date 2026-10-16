import type { JsonObject } from '../../../core/json';
import type { JobStatus } from './entities';

export interface CreateJob {
  id?: string;
  type: string;
  payload?: JsonObject | null;
  priority?: number;
}

export interface UpdateJob {
  status?: JobStatus;
  checkpoint?: JsonObject | null;
  /** Increment the attempt counter (used on retries). */
  incrementAttempts?: boolean;
}
