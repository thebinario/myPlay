/**
 * `IpcImportRunner` — importação real baseada no kernel (`indexing.scan` +
 * eventos `media:discovered` / `index:progress` / `index:completed`).
 *
 * O transporte (Electron IPC) é o único dublê; a máquina de estados e o mapeamento
 * de eventos → `ImportState` são exercitados de verdade.
 */
import { describe, it, expect } from 'vitest';
import type { IndexSummary } from '@midoteca/core';
import type { DesktopEvent, MidotecaBridge } from '@/core/contracts/desktop-bridge';
import type { ImportState, LibrarySource } from '@/core/domain/library-source';
import { IpcImportRunner } from '@/modules/sources/infrastructure/ipc/ipc-import-runner';

function connectedSource(overrides: Partial<LibrarySource> = {}): LibrarySource {
  return {
    id: 'src-1',
    path: '/Volumes/HD',
    name: 'HD',
    status: 'connected',
    itemCount: 0,
    lastScannedAt: null,
    ...overrides,
  };
}

function summary(overrides: Partial<IndexSummary> = {}): IndexSummary {
  return {
    sourceId: 'src-1',
    status: 'completed',
    discovered: 0,
    created: 0,
    updated: 0,
    moved: 0,
    unchanged: 0,
    missing: 0,
    errors: 0,
    durationMs: 1,
    ...overrides,
  };
}

function createFakeBridge() {
  const listeners = new Set<(event: DesktopEvent) => void>();
  const handlers: Record<string, (params: unknown) => unknown> = {};
  const invoke = (async (method: string, params?: unknown) => {
    const handler = handlers[method];
    if (!handler) throw new Error(`método inesperado: ${method}`);
    return handler(params);
  }) as MidotecaBridge['invoke'];
  const bridge: MidotecaBridge = {
    invoke,
    onEvent: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    pickDirectory: async () => null,
  };
  return {
    bridge,
    handlers,
    emit: (event: DesktopEvent) => listeners.forEach((listener) => listener(event)),
  };
}

async function flush(ticks = 6): Promise<void> {
  for (let i = 0; i < ticks; i++) await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('IpcImportRunner', () => {
  it('não inicia sem fontes conectadas', () => {
    const { bridge } = createFakeBridge();
    const runner = new IpcImportRunner(bridge);

    runner.start([connectedSource({ status: 'disconnected' })]);

    expect(runner.getState().phase).toBe('disconnected');
    expect(runner.getState().message).toBeTruthy();
  });

  it('percorre scanning → done mapeando os conteúdos descobertos reais', async () => {
    const { bridge, handlers, emit } = createFakeBridge();
    let resolveScan!: (value: IndexSummary) => void;
    handlers['indexing.scan'] = () =>
      new Promise<IndexSummary>((resolve) => {
        resolveScan = resolve;
      });

    const runner = new IpcImportRunner(bridge);
    runner.start([connectedSource()]);
    expect(runner.getState().phase).toBe('scanning');

    emit({
      name: 'media:discovered',
      payload: { mediaId: 'm1', sourceId: 'src-1', relativePath: 'Curso/aula-01.mp4' },
    });
    emit({
      name: 'media:discovered',
      payload: { mediaId: 'm2', sourceId: 'src-1', relativePath: 'Curso/manual.pdf' },
    });
    emit({
      name: 'media:discovered',
      payload: { mediaId: 'm3', sourceId: 'src-1', relativePath: 'Curso/legenda.srt' },
    });

    resolveScan(summary({ discovered: 3 }));
    await flush();

    const state = runner.getState();
    expect(state.phase).toBe('done');
    expect(state.progress).toBe(100);
    expect(state.discovered.map((item) => item.title)).toEqual(['aula-01.mp4', 'manual.pdf']);
    expect(state.discovered.map((item) => item.kind)).toEqual(['movie', 'document']);
    expect(state.discovered.map((item) => item.sourceId)).toEqual(['src-1', 'src-1']);
  });

  it('termina como "empty" quando a fonte não tem conteúdo compatível', async () => {
    const { bridge, handlers } = createFakeBridge();
    handlers['indexing.scan'] = () => Promise.resolve(summary({ discovered: 0 }));

    const runner = new IpcImportRunner(bridge);
    runner.start([connectedSource()]);
    await flush();

    expect(runner.getState().phase).toBe('empty');
    expect(runner.getState().progress).toBe(100);
  });

  it('termina como "disconnected" quando o kernel reporta fonte indisponível', async () => {
    const { bridge, handlers } = createFakeBridge();
    handlers['indexing.scan'] = () => Promise.resolve(summary({ status: 'source-unavailable' }));

    const runner = new IpcImportRunner(bridge);
    runner.start([connectedSource()]);
    await flush();

    expect(runner.getState().phase).toBe('disconnected');
    expect(runner.getState().message).toBeTruthy();
  });

  it('expõe erro recuperável quando o kernel falha a análise', async () => {
    const { bridge, handlers } = createFakeBridge();
    handlers['indexing.scan'] = () => Promise.reject(new Error('kernel indisponível'));

    const runner = new IpcImportRunner(bridge);
    runner.start([connectedSource()]);
    await flush();

    expect(runner.getState().phase).toBe('error');
    expect(runner.getState().message).toContain('kernel indisponível');

    runner.retry();
    expect(runner.getState().phase).toBe('scanning');
  });

  it('analisa múltiplas fontes em sequência somando o progresso', async () => {
    const { bridge, handlers } = createFakeBridge();
    const scanned: string[] = [];
    handlers['indexing.scan'] = (params) => {
      const { sourceId } = params as { sourceId: string };
      scanned.push(sourceId);
      return Promise.resolve(
        summary({ sourceId, discovered: 1, created: 1 }),
      );
    };

    const runner = new IpcImportRunner(bridge);
    const states: ImportState[] = [];
    runner.subscribe(() => states.push(runner.getState()));
    runner.start([connectedSource({ id: 's1' }), connectedSource({ id: 's2' })]);
    await flush(10);

    expect(scanned).toEqual(['s1', 's2']);
    expect(runner.getState().phase).toBe('done');
    expect(runner.getState().progress).toBe(100);
    expect(states.some((state) => state.progress === 50)).toBe(true);
  });

  it('declara que não é simulado e desliga controles de demonstração', () => {
    const { bridge } = createFakeBridge();
    const runner = new IpcImportRunner(bridge);
    expect(runner.simulated).toBe(false);
  });

  it('reset volta ao estado inicial', async () => {
    const { bridge, handlers } = createFakeBridge();
    handlers['indexing.scan'] = () => Promise.resolve(summary({ discovered: 2 }));

    const runner = new IpcImportRunner(bridge);
    runner.start([connectedSource()]);
    await flush();
    runner.reset();

    expect(runner.getState().phase).toBe('idle');
    expect(runner.getState().discovered).toEqual([]);
  });
});
