import type { Job, JobStatus } from './entities';
import type { CreateJob, UpdateJob } from './inputs';

export interface JobRepository {
  enqueue(input: CreateJob): Promise<Job>;
  findById(id: string): Promise<Job | null>;
  /** Highest priority first, oldest first as tie-breaker. */
  listByStatus(status: JobStatus, limit?: number): Promise<Job[]>;
  update(id: string, input: UpdateJob): Promise<Job>;
  delete(id: string): Promise<void>;
}
