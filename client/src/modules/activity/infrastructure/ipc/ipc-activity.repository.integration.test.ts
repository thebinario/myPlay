import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  DESKTOP_EVENTS,
  createDesktopApi,
  createMidoteca,
  type DesktopEvent,
  type Midoteca,
} from '@midoteca/core';
import type { MidotecaBridge } from '@/core/contracts/desktop-bridge';
import { IpcActivityRepository } from '@/modules/activity/infrastructure/ipc/ipc-activity.repository';
import { eventually } from '@/modules/sources/infrastructure/ipc/fake-library-sources-bridge';

/** Real kernel; only the Electron transport is replaced (RPC + event forwarding). */
function createInProcessBridge(app: Midoteca): MidotecaBridge {
  const api = createDesktopApi(app);
  return {
    invoke: (async (method, params) => {
      const response = await api.handle({ method, params });
      if (!response.ok) throw new Error(response.error.message);
      return response.data;
    }) as MidotecaBridge['invoke'],
    onEvent: (listener) => {
      const offs = DESKTOP_EVENTS.map((name) =>
        app.events.on(name, (payload) => listener({ name, payload } as DesktopEvent)),
      );
      return () => offs.forEach((off) => off());
    },
    pickDirectory: async () => null,
  };
}

describe('IpcActivityRepository (integração com o núcleo)', () => {
  let dir: string;
  let app: Midoteca;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'midoteca-activity-'));
    app = createMidoteca({ databaseFile: join(dir, 'db.sqlite') });
  });

  afterEach(() => {
    app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('carrega o retrato inicial e acompanha activity:changed do núcleo', async () => {
    const library = mkdtempSync(join(dir, 'Cursos-'));
    const source = await app.sources.addSource({ rootPath: library, displayName: 'Cursos' });
    const repository = new IpcActivityRepository(createInProcessBridge(app));
    let notified = 0;
    repository.subscribe(() => (notified += 1));

    await repository.hydrate();
    expect(repository.getSnapshot()).toEqual({ items: [], running: 0, queued: 0, recent: [] });

    app.events.emit('index:started', { sourceId: source.id });
    await eventually(() =>
      expect(repository.getSnapshot().items[0]).toMatchObject({
        kind: 'scan',
        status: 'running',
        label: 'Atualizando biblioteca · Cursos',
      }),
    );
    expect(notified).toBeGreaterThan(0);

    app.events.emit('index:completed', {
      sourceId: source.id,
      summary: {} as never,
    });
    await eventually(() => expect(repository.getSnapshot().running).toBe(0));
    expect(repository.getSnapshot().recent[0]).toMatchObject({
      kind: 'scan',
      status: 'completed',
      label: 'Atualizando biblioteca · Cursos',
      finishedAt: expect.any(String),
    });
    repository.dispose();
  });
});
