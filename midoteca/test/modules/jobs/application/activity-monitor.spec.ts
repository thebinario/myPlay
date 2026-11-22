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
      label: 'Análise de mídia · Cursos',
      percent: 25,
      progress: { done: 1, total: 4 },
      detail: 'Módulo 1/aula.mp4',
    });
    expect(during.items[1]).toMatchObject({
      kind: 'transcription',
      status: 'queued',
      label: 'Transcrição · Cursos',
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
      label: 'Atualizando biblioteca · Cursos',
      progress: { done: 12, total: null },
      percent: null,
      detail: 'Módulo 2/aula.mp4',
    });

    events.emit('index:failed', { sourceId: 'src-1', message: 'HD removido' });
    const after = await monitor.snapshot();
    expect(after.items).toHaveLength(0);
    expect(after.recent[0]).toMatchObject({
      kind: 'scan',
      status: 'failed',
      label: 'Atualizando biblioteca · Cursos',
    });
  });

  it('retira o job da lista e registra uma única falha (as novas tentativas não contam)', async () => {
    runner.register('media.analyze-source', async () => {
      throw new Error('boom');
    });
    await app.jobs.enqueue({ type: 'media.analyze-source', payload: { sourceId: 'src-1' } });
    await runner.drain();
    const after = await monitor.snapshot();
    expect(after.running).toBe(0);
    expect(after.recent).toHaveLength(1);
    expect(after.recent[0]).toMatchObject({
      kind: 'media-analysis',
      status: 'failed',
      label: 'Análise de mídia · Cursos',
    });
    expect(Date.parse(after.recent[0].finishedAt!)).not.toBeNaN();
  });

  describe('últimos processos encerrados', () => {
    it('registra o job concluído com o horário de término', async () => {
      runner.register('media.transcribe-source', async (context) => {
        context.reportProgress({ done: 2, total: 2 });
      });
      await app.jobs.enqueue({ type: 'media.transcribe-source', payload: { sourceId: 'src-1' } });
      await runner.drain();

      const after = await monitor.snapshot();
      expect(after.items).toHaveLength(0);
      expect(after.recent).toEqual([
        expect.objectContaining({
          kind: 'transcription',
          status: 'completed',
          label: 'Transcrição · Cursos',
          percent: 100,
          finishedAt: expect.any(String),
        }),
      ]);
      await vi.waitFor(() =>
        expect(last).toMatchObject({ recent: [expect.objectContaining({ status: 'completed' })] }),
      );
    });

    it('não registra job que não tinha nada a processar', async () => {
      runner.register('search.extract-content', async (context) => {
        context.reportProgress({ done: 0, total: 0 });
      });
      await app.jobs.enqueue({ type: 'search.extract-content', payload: { sourceId: 'src-1' } });
      await runner.drain();
      expect((await monitor.snapshot()).recent).toEqual([]);
    });

    it('registra o escaneamento concluído, mas não o pausado', async () => {
      events.emit('index:started', { sourceId: 'src-1' });
      events.emit('index:paused', { sourceId: 'src-1' });
      expect((await monitor.snapshot()).recent).toEqual([]);

      events.emit('index:started', { sourceId: 'src-1' });
      events.emit('index:completed', { sourceId: 'src-1' } as never);
      const after = await monitor.snapshot();
      expect(after.recent.map((item) => [item.kind, item.status])).toEqual([['scan', 'completed']]);
    });

    it('mantém só os 5 mais recentes, o último primeiro', async () => {
      for (const n of [1, 2, 3, 4, 5, 6]) {
        events.emit('index:started', { sourceId: `src-${n}` });
        events.emit('index:completed', { sourceId: `src-${n}` } as never);
      }
      const after = await monitor.snapshot();
      expect(after.recent.map((item) => item.sourceId)).toEqual([
        'src-6',
        'src-5',
        'src-4',
        'src-3',
        'src-2',
      ]);
    });
  });
});
