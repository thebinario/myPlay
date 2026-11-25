import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDesktopApi, createMidoteca, type Midoteca } from '@midoteca/core';
import type { MidotecaBridge } from '@/core/contracts/desktop-bridge';
import { IpcStudyRepository } from '@/modules/study/infrastructure/ipc/ipc-study.repository';

/** Núcleo real; só o transporte do Electron é substituído. */
function createInProcessBridge(app: Midoteca): MidotecaBridge {
  const api = createDesktopApi(app);
  return {
    invoke: (async (method, params) => {
      const response = await api.handle({ method, params });
      if (!response.ok) throw new Error(response.error.message);
      return response.data;
    }) as MidotecaBridge['invoke'],
    onEvent: () => () => {},
    pickDirectory: async () => null,
  };
}

describe('IpcStudyRepository (integração com o núcleo)', () => {
  let dir: string;
  let app: Midoteca;
  let now: Date;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'midoteca-study-'));
    now = new Date(2026, 10, 25, 19, 15);
    app = createMidoteca({ databaseFile: join(dir, 'db.sqlite'), clock: () => now });
  });

  afterEach(() => {
    app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('planeja, cronometra e lê o dia com o foco decidido pelo núcleo', async () => {
    const repository = new IpcStudyRepository(createInProcessBridge(app));
    const htb = await repository.saveTrack({
      title: 'Hack The Box',
      kind: 'external',
      platform: 'Hack The Box',
      url: 'https://app.hackthebox.com',
    });
    await repository.saveSchedule([
      { trackId: htb.id, weekday: 3, startMinute: 19 * 60, durationMinutes: 60, activity: 'lab' },
    ]);
    await repository.startTimer(htb.id, 'lab');
    now = new Date(2026, 10, 25, 19, 45);

    const day = await repository.getDay();
    expect(day.focus).toMatchObject({ kind: 'now', remainingMinutes: 30 });
    expect(day.blocks[0]).toMatchObject({ status: 'now', loggedMinutes: 30 });
    expect(day.timer?.track.title).toBe('Hack The Box');

    await repository.stopTimer();
    await repository.logSession({ trackId: htb.id, date: '2026-11-24', minutes: 45 });
    const week = await repository.getWeek();
    expect(week.totalLoggedMinutes).toBe(75);
    expect((await repository.getSchedule())[0].activity).toBe('lab');
  });

  it('pesquisa os cursos da biblioteca no núcleo, agrupados por biblioteca', async () => {
    const repository = new IpcStudyRepository(createInProcessBridge(app));
    await app.courses.create({ title: 'Pentest Web' });
    await app.courses.create({ title: 'Inglês técnico' });

    const groups = await repository.listCourses('pentest');
    expect(groups).toEqual([
      {
        sourceId: null,
        libraryName: 'Cursos avulsos',
        courses: [expect.objectContaining({ title: 'Pentest Web', moduleCount: 0 })],
      },
    ]);
    expect((await repository.listCourses())[0].courses).toHaveLength(2);
  });

  it('propaga a validação do núcleo como erro legível', async () => {
    const repository = new IpcStudyRepository(createInProcessBridge(app));
    await expect(repository.saveTrack({ title: 'HTB', kind: 'external' })).rejects.toThrow(
      /plataforma/i,
    );
  });
});
