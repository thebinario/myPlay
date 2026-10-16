import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDesktopApi, createMidoteca, type DesktopApi, type Midoteca } from '@midoteca/core';
import type { MidotecaBridge } from '@/core/contracts/desktop-bridge';
import type { LibrarySource } from '@/core/domain/library-source';
import { IpcLibrarySourcesRepository } from '@/modules/sources/infrastructure/ipc/ipc-library-sources.repository';

/**
 * End-to-end test of the real integration: `IpcLibrarySourcesRepository` →
 * bridge → `createDesktopApi` → `createMidoteca` → real SQLite + real filesystem.
 * Only the transport (Electron IPC) is faked; everything else is the kernel.
 */
function createInProcessBridge(api: DesktopApi): MidotecaBridge {
  const invoke: MidotecaBridge['invoke'] = async (method, params) => {
    const response = await api.handle({ method, params });
    if (!response.ok) throw new Error(response.error.message);
    return response.data as never;
  };
  return {
    invoke,
    onEvent: () => () => {},
    pickDirectory: async () => null,
  };
}

async function eventually(assertion: () => void, timeoutMs = 2000): Promise<void> {
  const start = Date.now();
  let lastError: unknown;
  while (Date.now() - start < timeoutMs) {
    try {
      assertion();
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
  throw lastError;
}

function localSource(overrides: Partial<LibrarySource> = {}): LibrarySource {
  return {
    id: 'local-optimistic',
    path: '',
    name: 'Biblioteca de Teste',
    status: 'connected',
    itemCount: 0,
    lastScannedAt: null,
    ...overrides,
  };
}

describe('IpcLibrarySourcesRepository (kernel integration)', () => {
  let workDir: string;
  let libraryDir: string;
  let midoteca: Midoteca;
  let repository: IpcLibrarySourcesRepository;

  beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), 'midoteca-ipc-'));
    libraryDir = join(workDir, 'library');
    mkdirSync(join(libraryDir, 'Curso de Teste'), { recursive: true });
    writeFileSync(join(libraryDir, 'Curso de Teste', 'aula-01.mp4'), 'conteúdo');
    midoteca = createMidoteca({ databaseFile: join(workDir, 'db.sqlite') });
    repository = new IpcLibrarySourcesRepository(createInProcessBridge(createDesktopApi(midoteca)));
  });

  afterEach(() => {
    repository.dispose();
    midoteca.close();
    rmSync(workDir, { recursive: true, force: true });
  });

  it('hydrates an empty catalog from the kernel', async () => {
    await repository.hydrate();
    expect(repository.list()).toEqual([]);
  });

  it('adds a real source through the bridge and reconciles the optimistic row', async () => {
    await repository.hydrate();

    repository.save(localSource({ path: libraryDir }));
    expect(repository.list()).toHaveLength(1);

    await eventually(() => {
      const [source] = repository.list();
      expect(source.id).not.toBe('local-optimistic');
      expect(source.path).toBe(libraryDir);
      expect(source.name).toBe('Biblioteca de Teste');
      expect(source.status).toBe('connected');
    });
  });

  it('reflects a source already stored in the kernel after re-hydration', async () => {
    await midoteca.sources.addSource({ rootPath: libraryDir, displayName: 'HD Teste' });
    await repository.hydrate();

    const [source] = repository.list();
    expect(source.path).toBe(libraryDir);
    expect(source.name).toBe('HD Teste');
    expect(source.status).toBe('connected');
  });

  it('removes a source from the kernel without touching the filesystem', async () => {
    const created = await midoteca.sources.addSource({ rootPath: libraryDir, displayName: null });
    await repository.hydrate();
    expect(repository.list()).toHaveLength(1);

    repository.remove(created.id);
    expect(repository.list()).toEqual([]);

    await expect.poll(() => midoteca.sources.listSources()).toEqual([]);
    expect(() => writeFileSync(join(libraryDir, 'probe.txt'), 'ok')).not.toThrow();
  });

  it('probes availability against the real filesystem', async () => {
    const created = await midoteca.sources.addSource({ rootPath: libraryDir, displayName: null });
    await repository.hydrate();

    await expect(repository.probe(created.id)).resolves.toBe('connected');

    rmSync(libraryDir, { recursive: true, force: true });
    await expect(repository.probe(created.id)).resolves.toBe('disconnected');
  });
});
