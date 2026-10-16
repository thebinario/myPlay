import { describe, it, expect } from 'vitest';
import type { LibrarySource } from '@/core/domain/library-source';
import { createMockImportRunner } from '@/modules/sources/infrastructure/mock/import-runner';

const connected: LibrarySource[] = [
  {
    id: 'src-1',
    path: 'D:/Cursos',
    name: 'Cursos',
    status: 'connected',
    itemCount: 0,
    lastScannedAt: null,
  },
];

function runToEnd(runner: ReturnType<typeof createMockImportRunner>) {
  for (let i = 0; i < 10 && runner.getState().phase === 'scanning'; i++) runner.advance();
}

describe('sources/import — runner determinístico', () => {
  it('percorre scanning até done revelando conteúdos', () => {
    const runner = createMockImportRunner();
    runner.start(connected);
    expect(runner.getState().phase).toBe('scanning');

    runner.advance();
    expect(runner.getState().progress).toBe(20);
    expect(runner.getState().discovered.length).toBeGreaterThan(0);

    runToEnd(runner);
    expect(runner.getState().phase).toBe('done');
    expect(runner.getState().progress).toBe(100);
    expect(runner.getState().discovered).toHaveLength(6);
  });

  it('reporta a análise de cada fonte conectada ao concluir', () => {
    const scans: { id: string; count: number }[] = [];
    const runner = createMockImportRunner({
      onSourceScanned: (id, count) => scans.push({ id, count }),
    });
    runner.start(connected);
    runToEnd(runner);
    expect(scans).toEqual([{ id: 'src-1', count: 6 }]);
  });

  it('pausa e retoma mantendo o progresso', () => {
    const runner = createMockImportRunner();
    runner.start(connected);
    runner.advance();
    runner.pause();
    expect(runner.getState().phase).toBe('paused');

    const progress = runner.getState().progress;
    runner.advance();
    expect(runner.getState().progress).toBe(progress);

    runner.resume();
    expect(runner.getState().phase).toBe('scanning');
  });

  it('não inicia sem fontes conectadas', () => {
    const runner = createMockImportRunner();
    runner.start([{ ...connected[0], status: 'disconnected' }]);
    expect(runner.getState().phase).toBe('disconnected');
    expect(runner.getState().message).toBeTruthy();
  });

  it('cobre os cenários de fonte vazia, permissão negada e offline', () => {
    const empty = createMockImportRunner();
    empty.setScenario('empty');
    empty.start(connected);
    runToEnd(empty);
    expect(empty.getState().phase).toBe('empty');

    const denied = createMockImportRunner();
    denied.setScenario('denied');
    denied.start(connected);
    expect(denied.getState().phase).toBe('denied');

    const offline = createMockImportRunner();
    offline.setScenario('offline');
    offline.start(connected);
    expect(offline.getState().phase).toBe('disconnected');
  });

  it('interrompe com erro recuperável e recupera no retry', () => {
    const runner = createMockImportRunner();
    runner.setScenario('error');
    runner.start(connected);
    runner.advance();
    runner.advance();
    runner.advance();
    expect(runner.getState().phase).toBe('error');

    runner.retry();
    expect(runner.getState().phase).toBe('scanning');
    runToEnd(runner);
    expect(runner.getState().phase).toBe('done');
  });
});
