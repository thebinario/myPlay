import { describe, expect, it, vi } from 'vitest';
import type { MidotecaBridge } from '@/core/contracts/desktop-bridge';
import { IpcContentSearchRepository } from '@/modules/search/infrastructure/ipc/ipc-content-search.repository';

describe('IpcContentSearchRepository', () => {
  it('delega a busca no conteúdo ao núcleo (FTS5), sem filtrar no cliente', async () => {
    const hits = [{ chunkId: 1, sourceKind: 'pdf', snippet: '[[docker]] compose', page: 2 }];
    const invoke = vi.fn(async () => hits);
    const bridge = {
      invoke,
      onEvent: () => () => {},
      pickDirectory: async () => null,
    } as unknown as MidotecaBridge;

    await expect(new IpcContentSearchRepository(bridge).search('docker')).resolves.toEqual(hits);
    expect(invoke).toHaveBeenCalledWith('search.content', { text: 'docker', limit: 20 });
  });
});
