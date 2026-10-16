import { describe, expect, it } from 'vitest';
import { IpcLibrarySourcesRepository } from '@/modules/sources/infrastructure/ipc/ipc-library-sources.repository';
import {
  createFakeBridge,
  eventually,
  localSource,
  type FakeSource,
} from '@/modules/sources/infrastructure/ipc/fake-library-sources-bridge';

describe('IpcLibrarySourcesRepository writes', () => {
  it('waits for a newly added source to become authoritative before scanning', async () => {
    const persisted: FakeSource = {
      id: 'kernel-id',
      rootPath: '/Volumes/HD',
      displayName: 'HD',
      status: 'active',
      lastScanAt: null,
    };
    let listCalls = 0;
    const bridge = createFakeBridge({
      'sources.list': () => (++listCalls === 2 ? [] : [persisted]),
      'indexing.status': () => null,
      'sources.add': () => persisted,
    });
    const repository = new IpcLibrarySourcesRepository(bridge);
    await repository.hydrate();
    repository.save(localSource());

    await repository.waitForPersistence('local-1');

    expect(repository.list().map(({ id }) => id)).toEqual(['kernel-id']);
  });

  it('uses the source returned by the backend when the list refresh is stale', async () => {
    const persisted: FakeSource = {
      id: 'kernel-id',
      rootPath: '/Volumes/HD',
      displayName: 'HD',
      status: 'active',
      lastScanAt: null,
    };
    const bridge = createFakeBridge({
      'sources.list': () => [],
      'indexing.status': () => null,
      'sources.add': () => persisted,
    });
    const repository = new IpcLibrarySourcesRepository(bridge);
    await repository.hydrate();
    repository.save(localSource());

    await expect(repository.waitForPersistence('local-1')).resolves.toBeUndefined();

    expect(repository.list().map(({ id }) => id)).toEqual(['kernel-id']);
  });

  it('confirma a biblioteca pela identidade retornada mesmo quando o backend normaliza o caminho', async () => {
    const persisted: FakeSource = {
      id: 'kernel-id', rootPath: '/private/var/library', displayName: 'HD',
      status: 'active', lastScanAt: null,
    };
    const bridge = createFakeBridge({
      'sources.list': () => [],
      'indexing.status': () => null,
      'sources.add': () => persisted,
    });
    const repository = new IpcLibrarySourcesRepository(bridge);
    await repository.hydrate();
    repository.save(localSource());

    await expect(repository.waitForPersistence('local-1')).resolves.toBeUndefined();
  });

  it('renames a source through the kernel and updates its snapshot', async () => {
    const source: FakeSource = {
      id: 'k1',
      rootPath: '/Volumes/HD',
      displayName: 'HD',
      status: 'active',
      lastScanAt: null,
    };
    const state = { sources: [source] };
    const bridge = createFakeBridge({
      'sources.list': () => state.sources,
      'indexing.status': () => null,
      'sources.rename': (params) => {
        const { sourceId, displayName } = params as { sourceId: string; displayName: string };
        state.sources = state.sources.map((item) =>
          item.id === sourceId ? { ...item, displayName } : item,
        );
        return state.sources[0];
      },
    });
    const repository = new IpcLibrarySourcesRepository(bridge);
    await repository.hydrate();

    await repository.rename('k1', 'Cursos');

    expect(repository.getById('k1')?.name).toBe('Cursos');
  });

  it('removes the catalog reference without touching the source path', async () => {
    const source: FakeSource = {
      id: 'k1',
      rootPath: '/Volumes/HD',
      displayName: null,
      status: 'active',
      lastScanAt: null,
    };
    const state = { sources: [source] };
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
  });
});
