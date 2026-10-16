import { describe, expect, it, vi } from 'vitest';
import { IpcLibrarySourcesRepository } from '@/modules/sources/infrastructure/ipc/ipc-library-sources.repository';
import {
  createFakeBridge,
  eventually,
  localSource,
  type FakeSource,
} from '@/modules/sources/infrastructure/ipc/fake-library-sources-bridge';

describe('IpcLibrarySourcesRepository (fake bridge)', () => {
  it('hydrates sources with index counters and notifies listeners', async () => {
    const kernel: FakeSource = {
      id: 'k1', rootPath: '/Volumes/HD', displayName: 'HD Cursos', status: 'active', lastScanAt: null,
    };
    const bridge = createFakeBridge({
      'sources.list': () => [kernel],
      'indexing.status': () => ({
        sourceId: 'k1', status: 'active', lastScanAt: null, mediaCount: 7, courseCount: 2,
      }),
    });
    const repository = new IpcLibrarySourcesRepository(bridge);
    const listener = vi.fn();
    repository.subscribe(listener);

    await repository.hydrate();

    expect(repository.list()[0]).toMatchObject({ id: 'k1', name: 'HD Cursos', itemCount: 7 });
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
          id: 'k-new', rootPath, displayName, status: 'active', lastScanAt: null,
        };
        state.sources = [created];
        return created;
      },
    });
    const repository = new IpcLibrarySourcesRepository(bridge);
    await repository.hydrate();

    repository.save(localSource());
    expect(repository.list()).toHaveLength(1);
    await eventually(() => expect(repository.list()[0]?.id).toBe('k-new'));
  });
});
