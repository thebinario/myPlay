import { describe, expect, it, vi } from 'vitest';
import type { MidotecaBridge } from '@/core/contracts/desktop-bridge';
import { IpcSubtitlesRepository } from '@/modules/player/infrastructure/ipc/ipc-subtitles.repository';

describe('IpcSubtitlesRepository', () => {
  it('busca as legendas já interpretadas pelo backend para a aula', async () => {
    const tracks = [
      { id: 't1', language: 'pt', generated: true, cues: [{ startMs: 0, endMs: 1, text: 'a' }] },
    ];
    const invoke = vi.fn(async () => tracks);
    const bridge = { invoke, onEvent: () => () => {}, pickDirectory: async () => null };

    const repository = new IpcSubtitlesRepository(bridge as unknown as MidotecaBridge);

    await expect(repository.forLesson('l1')).resolves.toEqual(tracks);
    expect(invoke).toHaveBeenCalledWith('subtitles.forLesson', { lessonId: 'l1' });
  });
});
