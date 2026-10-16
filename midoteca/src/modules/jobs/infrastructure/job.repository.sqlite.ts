import { nowIso } from '../../../core/clock';
import { NotFoundError } from '../../../core/errors';
import { decodeObject, encodeJson } from '../../../core/json-codec';
import {
  assertNonEmptyString,
  assertOneOf,
  assertOptionalInteger,
  resolveId,
} from '../../../core/validation';
import { JOB_STATUSES, type Job, type JobStatus } from '../domain/entities';
import type { CreateJob, UpdateJob } from '../domain/inputs';
import type { JobRepository } from '../domain/ports';
import type { SqliteDatabase } from '../../../platform/persistence/sqlite/database';
import { mapSqliteError } from '../../../platform/persistence/sqlite/errors';

interface JobRow {
  id: string;
  type: string;
  status: string;
  priority: number;
  payload: string | null;
  checkpoint: string | null;
  attempts: number;
  created_at: string;
  updated_at: string;
}

function mapJob(row: JobRow): Job {
  return {
    id: row.id,
    type: row.type,
    status: row.status as JobStatus,
    priority: row.priority,
    payload: decodeObject(row.payload),
    checkpoint: decodeObject(row.checkpoint),
    attempts: row.attempts,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const JOB_SELECT = `
  SELECT id, type, status, priority, payload, checkpoint, attempts, created_at, updated_at
  FROM jobs
`;

export class SqliteJobRepository implements JobRepository {
  constructor(private readonly db: SqliteDatabase) {}

  async enqueue(input: CreateJob): Promise<Job> {
    const now = nowIso();
    const job: Job = {
      id: resolveId(input.id, 'id'),
      type: assertNonEmptyString(input.type, 'type'),
      status: 'pending',
      priority: assertOptionalInteger(input.priority, 'priority') ?? 0,
      payload: input.payload ?? null,
      checkpoint: null,
      attempts: 0,
      createdAt: now,
      updatedAt: now,
    };
    try {
      this.db
        .prepare(
          `INSERT INTO jobs
             (id, type, status, priority, payload, checkpoint, attempts, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          job.id,
          job.type,
          job.status,
          job.priority,
          encodeJson(job.payload),
          encodeJson(job.checkpoint),
          job.attempts,
          job.createdAt,
          job.updatedAt,
        );
    } catch (error) {
      throw mapSqliteError(error, 'enqueueJob');
    }
    return job;
  }

  async findById(id: string): Promise<Job | null> {
    const row = this.db.prepare(`${JOB_SELECT} WHERE id = ?`).get(id) as JobRow | undefined;
    return row ? mapJob(row) : null;
  }

  async listByStatus(status: JobStatus, limit?: number): Promise<Job[]> {
    const value = assertOneOf(status, JOB_STATUSES, 'status');
    const bounded = assertOptionalInteger(limit, 'limit');
    const rows = this.db
      .prepare(
        `${JOB_SELECT} WHERE status = ?
         ORDER BY priority DESC, created_at ASC
         LIMIT ?`,
      )
      .all(value, bounded ?? -1) as JobRow[];
    return rows.map(mapJob);
  }

  async update(id: string, input: UpdateJob): Promise<Job> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundError(`Job ${id} not found`);

    const status =
      input.status === undefined
        ? existing.status
        : assertOneOf(input.status, JOB_STATUSES, 'status');
    const checkpoint = input.checkpoint === undefined ? existing.checkpoint : input.checkpoint;
    const attempts = existing.attempts + (input.incrementAttempts ? 1 : 0);

    this.db
      .prepare(
        `UPDATE jobs
           SET status = ?, checkpoint = ?, attempts = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(status, encodeJson(checkpoint), attempts, nowIso(), id);

    const updated = await this.findById(id);
    if (!updated) throw new NotFoundError(`Job ${id} not found`);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.db.prepare('DELETE FROM jobs WHERE id = ?').run(id);
  }
}
