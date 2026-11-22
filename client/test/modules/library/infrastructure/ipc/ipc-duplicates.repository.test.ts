import { describe, expect, it, vi } from 'vitest';
import type { MidotecaBridge } from '@/core/contracts/desktop-bridge';
import { IpcDuplicatesRepository } from '@/modules/library/infrastructure/ipc/ipc-duplicates.repository';

function bridgeWith(handlers: Record<string, (params: unknown) => unknown>): MidotecaBridge {
  return {
    invoke: vi.fn(async (method: string, params?: unknown) => {
      const handler = handlers[method];
      if (!handler) throw new Error(`método inesperado: ${method}`);
      return handler(params);
    }) as MidotecaBridge['invoke'],
    onEvent: () => () => {},
    pickDirectory: async () => null,
  };
}

describe('IpcDuplicatesRepository', () => {
  it('lê os grupos de duplicatas e o status da análise do núcleo, sem recalcular', async () => {
    const groups = [
      {
        kind: 'exact',
        members: [
          {
            mediaFileId: 'm1',
            sourceId: 's1',
            relativePath: 'A/aula.mp4',
            mediaType: 'video',
            fileSize: 10,
            durationMs: 60_000,
            lessons: [],
            documents: [],
          },
        ],
      },
    ];
    const repository = new IpcDuplicatesRepository(
      bridgeWith({
        'media.listDuplicateGroups': () => groups,
        'media.analysisStatus': () => ({ pending: 2, analyzed: 8, failed: 1 }),
      }),
    );

    await expect(repository.listGroups()).resolves.toEqual(groups);
    await expect(repository.analysisStatus()).resolves.toEqual({
      pending: 2,
      analyzed: 8,
      failed: 1,
    });
  });
});
