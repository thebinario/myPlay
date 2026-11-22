import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMidoteca, type Midoteca } from '../../../../src/index';
import { JobRunner } from '../../../../src/modules/jobs/application/job-runner';
import { ActivityMonitor } from '../../../../src/modules/jobs/application/activity-monitor';
import { ResourceGovernor } from '../../../../src/modules/indexing';
import { TypedEventBus } from '../../../../src/platform/events/typed-event-bus';
import { createTempDatabase, type TempDatabase } from '../../../helpers/temp-db';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
}

describe('ActivityMonitor (JobRunner + SQLite)', () => {
  let temp: TempDatabase;
  let app: Midoteca;
  let events: TypedEventBus;
  let monitor: ActivityMonitor;
  let runner: JobRunner;
  let last: { running: number; queued: number } | null;

  beforeEach(() => {
    temp = createTempDatabase();
    app = createMidoteca({ databaseFile: temp.file });
    events = new TypedEventBus();
    monitor = new ActivityMonitor({
      jobs: app.jobs,
      events,
      sourceNames: { nameOf: async (id) => (id === 'src-1' ? 'Cursos' : null) },
      throttleMs: 0,
    });
    runner = new JobRunner({
      jobs: app.jobs,
      governor: new ResourceGovernor({ throttleMs: 1 }),
      observer: monitor,
    });
    last = null;
    events.on('activity:changed', (snapshot) => (last = snapshot));
  });

  afterEach(async () => {
    monitor.dispose();
    await runner.stop();
    app.close();
    temp.cleanup();
  });

  it('mostra o job em execução com rótulo, percentual e item atual, e a fila', async () => {
    const reported = deferred();
    const release = deferred();
    runner.register('media.analyze-source', async (context) => {
      context.reportProgress({ done: 1, total: 4, detail: 'Módulo 1/aula.mp4' });
      reported.resolve();
      await release.promise;
    });
    await app.jobs.enqueue({
      type: 'media.analyze-source',
      payload: { sourceId: 'src-1' },
      priority: 5,
    });
    await app.jobs.enqueue({ type: 'media.transcribe-source', payload: { sourceId: 'src-1' } });

    const run = runner.runOnce();
    await reported.promise;
    const during = await monitor.snapshot();

    expect(during.running).toBe(1);
    expect(during.queued).toBe(1);
    expect(during.items[0]).toMatchObject({
      kind: 'media-analysis',
      status: 'running',
      label: 'Analisando mídias — Cursos',
      percent: 25,
      progress: { done: 1, total: 4 },
      detail: 'Módulo 1/aula.mp4',
    });
    expect(during.items[1]).toMatchObject({
      kind: 'transcription',
      status: 'queued',
      label: 'Transcrevendo vídeos — Cursos',
    });

    release.resolve();
    await run;
    const after = await monitor.snapshot();
    expect(after.running).toBe(0);
    expect(after.items.map((item) => item.kind)).toEqual(['transcription']);
    await vi.waitFor(() => expect(last).toMatchObject({ running: 0, queued: 1 }));
  });

  it('acompanha o escaneamento da biblioteca pelos eventos de indexação', async () => {
    events.emit('index:started', { sourceId: 'src-1' });
    events.emit('index:progress', {
      sourceId: 'src-1',
      matched: 12,
      visited: 40,
      currentPath: 'Módulo 2/aula.mp4',
    });

    const during = await monitor.snapshot();
    expect(during.items).toHaveLength(1);
    expect(during.items[0]).toMatchObject({
      kind: 'scan',
      status: 'running',
      label: 'Analisando biblioteca — Cursos',
      progress: { done: 12, total: null },
      percent: null,
      detail: 'Módulo 2/aula.mp4',
    });

    events.emit('index:failed', { sourceId: 'src-1', message: 'HD removido' });
    expect((await monitor.snapshot()).items).toHaveLength(0);
  });

  it('retira o job da lista mesmo quando ele falha', async () => {
    runner.register('media.analyze-source', async () => {
      throw new Error('boom');
    });
    await app.jobs.enqueue({ type: 'media.analyze-source', payload: { sourceId: 'src-1' } });
    await runner.drain();
    const after = await monitor.snapshot();
    expect(after.running).toBe(0);
  });
});
