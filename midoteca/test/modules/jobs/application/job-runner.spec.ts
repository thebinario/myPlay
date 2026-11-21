import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createMidoteca, type Midoteca } from '../../../../src/index';
import { JobRunner } from '../../../../src/modules/jobs/application/job-runner';
import { ResourceGovernor } from '../../../../src/modules/indexing';
import { createTempDatabase, type TempDatabase } from '../../../helpers/temp-db';

describe('JobRunner (SQLite)', () => {
  let temp: TempDatabase;
  let app: Midoteca;
  let governor: ResourceGovernor;
  let runner: JobRunner;

  beforeEach(() => {
    temp = createTempDatabase();
    app = createMidoteca({ databaseFile: temp.file });
    governor = new ResourceGovernor({ throttleMs: 1 });
    runner = new JobRunner({ jobs: app.jobs, governor, maxAttempts: 2 });
  });

  afterEach(async () => {
    await runner.stop();
    app.close();
    temp.cleanup();
  });

  it('runs pending jobs by priority and marks them completed', async () => {
    const order: string[] = [];
    runner.register('test.job', async ({ job }) => {
      order.push(String(job.payload?.name));
    });
    await app.jobs.enqueue({ type: 'test.job', payload: { name: 'low' }, priority: 0 });
    const high = await app.jobs.enqueue({
      type: 'test.job',
      payload: { name: 'high' },
      priority: 9,
    });

    await runner.drain();

    expect(order).toEqual(['high', 'low']);
    expect((await app.jobs.findById(high.id))?.status).toBe('completed');
  });

  it('retries a failing job and fails it after the max attempts', async () => {
    let calls = 0;
    runner.register('test.flaky', async () => {
      calls += 1;
      throw new Error('boom');
    });
    const job = await app.jobs.enqueue({ type: 'test.flaky' });

    await runner.drain();

    expect(calls).toBe(2);
    const stored = await app.jobs.findById(job.id);
    expect(stored?.status).toBe('failed');
    expect(stored?.attempts).toBe(2);
  });

  it('persists checkpoints so an interrupted job can resume', async () => {
    const seen: unknown[] = [];
    runner.register('test.resumable', async ({ job, saveCheckpoint }) => {
      seen.push(job.checkpoint);
      await saveCheckpoint({ cursor: 3 });
      if (!job.checkpoint) throw new Error('interrupted');
    });
    await app.jobs.enqueue({ type: 'test.resumable' });

    await runner.drain();

    expect(seen).toEqual([null, { cursor: 3 }]);
  });

  it('requeues jobs left running by a previous session', async () => {
    const job = await app.jobs.enqueue({ type: 'test.job' });
    await app.jobs.update(job.id, { status: 'running' });
    let ran = false;
    runner.register('test.job', async () => {
      ran = true;
    });

    await runner.recoverInterrupted();
    await runner.drain();

    expect(ran).toBe(true);
  });

  it('waits while the governor is paused', async () => {
    let ran = false;
    runner.register('test.job', async () => {
      ran = true;
    });
    await app.jobs.enqueue({ type: 'test.job' });
    governor.pause();

    const draining = runner.drain();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(ran).toBe(false);

    governor.resume();
    await draining;
    expect(ran).toBe(true);
  });

  it('fails jobs without a registered handler instead of looping', async () => {
    const job = await app.jobs.enqueue({ type: 'test.unknown' });
    await runner.drain();
    expect((await app.jobs.findById(job.id))?.status).toBe('failed');
  });
});
