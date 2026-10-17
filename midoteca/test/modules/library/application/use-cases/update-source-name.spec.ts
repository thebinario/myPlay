import { describe, expect, it } from 'vitest';
import type { LibrarySource } from '../../../../../src/modules/library/domain/entities';
import { UpdateSourceName } from '../../../../../src/modules/library/application/use-cases/update-source-name';

function source(displayName: string | null = 'Biblioteca'): LibrarySource {
  return {
    id: 'source-1',
    rootPath: '/media/library',
    displayName,
    volumeId: null,
    status: 'active',
    lastScanAt: null,
    createdAt: '2026-10-16T00:00:00.000Z',
    updatedAt: '2026-10-16T00:00:00.000Z',
  };
}

describe('UpdateSourceName', () => {
  it('stores a trimmed display name without changing the source path', async () => {
    let saved: LibrarySource | null = null;
    const library = {
      updateSourceName: async (_id: string, input: { displayName: string }) => {
        saved = { ...source(), displayName: input.displayName };
        return saved;
      },
    };

    await expect(
      new UpdateSourceName({ library }).execute({
        sourceId: 'source-1',
        displayName: '  Cursos  ',
      }),
    ).resolves.toMatchObject({ displayName: 'Cursos', rootPath: '/media/library' });
    expect(saved?.displayName).toBe('Cursos');
  });

  it('rejects a blank display name', async () => {
    const library = {
      updateSourceName: async () => source(),
    };

    await expect(
      new UpdateSourceName({ library }).execute({ sourceId: 'source-1', displayName: '   ' }),
    ).rejects.toThrow('displayName');
  });
});
