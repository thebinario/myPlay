import { describe, expect, it, vi } from 'vitest';
import type { MidotecaBridge } from '@/core/contracts/desktop-bridge';
import type { LibrarySource } from '@/core/domain/library-source';
import { IpcLibrarySourcesRepository } from '@/modules/sources/infrastructure/ipc/ipc-library-sources.repository';

interface FakeSource {
  id: string;
  rootPath: string;
  displayName: string | null;
  status: 'active' | 'offline' | 'scanning' | 'error';
  lastScanAt: string | null;
}

type Handler = (params: unknown) => unknown;

function createFakeBridge(handlers: Record<string, Handler>): MidotecaBridge {
  const invoke = (async (method: string, params?: unknown) => {
    const handler = handlers[method];
    if (!handler) throw new Error(`método inesperado: ${method}`);
    return handler(params);
  }) as MidotecaBridge['invoke'];
  return { invoke, onEvent: () => () => {}, pickDirectory: async () => null };
}

async function eventually(assertion: () => void, timeoutMs = 1000): Promise<void> {
  const start = Date.now();
  let lastError: unknown;
  while (Date.now() - start < timeoutMs) {
    try {
      assertion();
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
  throw lastError;
}

function localSource(overrides: Partial<LibrarySource> = {}): LibrarySource {
  return {
    id: 'local-1',
    path: '/Volumes/HD',
    name: 'HD',
    status: 'connected',
    itemCount: 0,
    lastScannedAt: null,
    ...overrides,
  };
}

describe('IpcLibrarySourcesRepository (fake bridge)', () => {
  it('hydrates sources with their index counters and notifies listeners', async () => {
    const kernel: FakeSource = {
      id: 'k1',
      rootPath: '/Volumes/HD',
      displayName: 'HD Cursos',
      status: 'active',
      lastScanAt: null,
    };
    const bridge = createFakeBridge({
      'sources.list': () => [kernel],
      'indexing.status': () => ({
        sourceId: 'k1',
        status: 'active',
        lastScanAt: null,
        mediaCount: 7,
        courseCount: 2,
      }),
    });
    const repository = new IpcLibrarySourcesRepository(bridge);
    const listener = vi.fn();
    repository.subscribe(listener);

    await repository.hydrate();

    expect(repository.list()).toEqual([
      {
        id: 'k1',
        path: '/Volumes/HD',
        name: 'HD Cursos',
        status: 'connected',
        itemCount: 7,
        lastScannedAt: null,
      },
    ]);
    expect(listener).toHaveBeenCalled();
  });

  it('inserts optimistically then reconciles with the kernel identity', async () => {
    const state: { sources: FakeSource[] } = { sources: [] };
    const bridge = createFakeBridge({
      'sources.list': () => state.sources,
      'indexing.status': () => null,
      'sources.add': (params) => {
        const { rootPath, displayName } = params as { rootPath: string; displayName: string };
        const created: FakeSource = {
          id: 'k-new',
          rootPath,
          displayName,
          status: 'active',
          lastScanAt: null,
        };
        state.sources = [created];
        return created;
      },
    });
    const repository = new IpcLibrarySourcesRepository(bridge);
    await repository.hydrate();

    repository.save(localSource());
    expect(repository.list()).toHaveLength(1);

    await eventually(() => {
      expect(repository.list()).toEqual([
        {
          id: 'k-new',
          path: '/Volumes/HD',
          name: 'HD',
          status: 'connected',
          itemCount: 0,
          lastScannedAt: null,
        },
      ]);
    });
  });

  it('removes optimistically and asks the kernel to drop the reference', async () => {
    const kernel: FakeSource = {
      id: 'k1',
      rootPath: '/Volumes/HD',
      displayName: null,
      status: 'active',
      lastScanAt: null,
    };
    const state = { sources: [kernel] as FakeSource[] };
    const removed: string[] = [];
    const bridge = createFakeBridge({
      'sources.list': () => state.sources,
      'indexing.status': () => null,
      'sources.remove': (params) => {
        removed.push((params as { sourceId: string }).sourceId);
        state.sources = [];
      },
    });
    const repository = new IpcLibrarySourcesRepository(bridge);
    await repository.hydrate();

    repository.remove('k1');
    expect(repository.list()).toEqual([]);

    await eventually(() => expect(removed).toEqual(['k1']));
    expect(repository.list()).toEqual([]);
  });

  it('probes availability through the kernel and maps the status', async () => {
    const bridge = createFakeBridge({
      'sources.check': () => ({
        id: 'k1',
        rootPath: '/Volumes/HD',
        displayName: null,
        status: 'offline',
        lastScanAt: null,
      }),
    });
    const repository = new IpcLibrarySourcesRepository(bridge);

    await expect(repository.probe('k1')).resolves.toBe('disconnected');
  });

  it('refreshes when the kernel emits a source/index event', async () => {
    const captured: { handler: ((event: { name: string; payload: unknown }) => void) | null } = {
      handler: null,
    };
    let listCalls = 0;
    const bridge = createFakeBridge({
      'sources.list': () => {
        listCalls += 1;
        return [];
      },
      'indexing.status': () => null,
    });
    bridge.onEvent = (handler) => {
      captured.handler = handler as typeof captured.handler;
      return () => {
        captured.handler = null;
      };
    };
    const repository = new IpcLibrarySourcesRepository(bridge);
    await repository.hydrate();
    const before = listCalls;

    captured.handler?.({ name: 'index:completed', payload: {} });

    await eventually(() => expect(listCalls).toBeGreaterThan(before));
  });
});
