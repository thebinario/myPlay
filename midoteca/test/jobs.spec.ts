import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createMidoteca, NotFoundError, type Midoteca } from '../src/index';
import { createTempDatabase, type TempDatabase } from './helpers/temp-db';

describe('job repository', () => {
  let temp: TempDatabase;
  let app: Midoteca;

  beforeEach(() => {
    temp = createTempDatabase();
    app = createMidoteca({ databaseFile: temp.file });
  });

  afterEach(() => {
    app.close();
    temp.cleanup();
  });

  it('enqueues a job in pending state', async () => {
    const job = await app.jobs.enqueue({
      type: 'indexing.scan-source',
      payload: { sourceId: 'x' },
      priority: 5,
    });
    expect(job.status).toBe('pending');
    expect(job.priority).toBe(5);
    expect(job.attempts).toBe(0);
    expect(job.payload).toEqual({ sourceId: 'x' });
  });

  it('lists jobs by status ordered by priority then age', async () => {
    await app.jobs.enqueue({ type: 'a', priority: 1 });
    await app.jobs.enqueue({ type: 'b', priority: 10 });
    await app.jobs.enqueue({ type: 'c', priority: 5 });

    const pending = await app.jobs.listByStatus('pending');
    expect(pending.map((j) => j.type)).toEqual(['b', 'c', 'a']);
  });

  it('updates status, checkpoint and attempts', async () => {
    const job = await app.jobs.enqueue({ type: 'a' });
    const running = await app.jobs.update(job.id, {
      status: 'running',
      checkpoint: { cursor: 10 },
    });
    expect(running.status).toBe('running');
    expect(running.checkpoint).toEqual({ cursor: 10 });

    const retried = await app.jobs.update(job.id, { incrementAttempts: true });
    expect(retried.attempts).toBe(1);
  });

  it('rejects updating an unknown job', async () => {
    await expect(
      app.jobs.update('missing', { status: 'running' }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('deletes a job', async () => {
    const job = await app.jobs.enqueue({ type: 'a' });
    await app.jobs.delete(job.id);
    expect(await app.jobs.findById(job.id)).toBeNull();
  });
});
