import { describe, expect, it } from 'vitest';
import type { DesktopEvent } from '@/core/contracts/desktop-bridge';
import { IpcLibrarySourcesRepository } from '@/modules/sources/infrastructure/ipc/ipc-library-sources.repository';
import {
  createFakeBridge,
  eventually,
} from '@/modules/sources/infrastructure/ipc/fake-library-sources-bridge';

describe('IpcLibrarySourcesRepository kernel events', () => {
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

  it('refreshes when the kernel emits a source or index event', async () => {
    const captured: { handler: ((event: DesktopEvent) => void) | null } = { handler: null };
    let listCalls = 0;
    const bridge = createFakeBridge({
      'sources.list': () => {
        listCalls += 1;
        return [];
      },
      'indexing.status': () => null,
    });
    bridge.onEvent = (handler) => {
      captured.handler = handler;
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
