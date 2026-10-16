/**
 * `IpcLibraryRepository` — catálogo real via kernel (`catalog.listCourses` +
 * `catalog.getCourseTree` + `catalog.listDocuments`) com snapshot em memória
 * (o port do FE é síncrono). Reprodução/leitura/PDF/busca são delegados.
 */
import { describe, it, expect, vi } from 'vitest';
import type {
  CourseSummary,
  DocumentSummary,
  LibrarySource as CoreLibrarySource,
  MediaFile,
} from '@midoteca/core';
import type { DesktopEvent, MidotecaBridge } from '@/core/contracts/desktop-bridge';
import { MockLibraryService } from '@/modules/library/infrastructure/mock-library-repository';
import { IpcLibraryRepository } from '@/modules/library/infrastructure/ipc/ipc-library-repository';

function coreSource(id: string, rootPath: string): CoreLibrarySource {
  return {
    id,
    rootPath,
    displayName: null,
    volumeId: null,
    status: 'active',
    lastScanAt: null,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  };
}

function coreMedia(
  id: string,
  sourceId: string,
  relativePath: string,
  mediaType: MediaFile['mediaType'],
  durationMs: number | null = null,
): MediaFile {
  return {
    id,
    sourceId,
    relativePath,
    mediaType,
    fileSize: 100,
    durationMs,
    modifiedAt: null,
    sha256: null,
    availability: 'available',
    lastSeenAt: null,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  };
}

function courseSummary(id: string, title: string, sourceId: string): CourseSummary {
  return {
    id,
    title,
    sourceId,
    relativePath: title,
    titleSource: 'detected',
    moduleCount: 1,
    lessonCount: 1,
    updatedAt: '2026-10-01T00:00:00Z',
  };
}

function documentSummary(
  id: string,
  title: string,
  mediaFileId: string,
  pageCount: number | null,
): DocumentSummary {
  return { id, title, mediaFileId, titleSource: 'detected', pageCount };
}

function createFakeBridge() {
  const listeners = new Set<(event: DesktopEvent) => void>();
  const calls: Record<string, number> = {};
  const handlers: Record<string, (params: unknown) => unknown> = {};
  const invoke = (async (method: string, params?: unknown) => {
    calls[method] = (calls[method] ?? 0) + 1;
    const handler = handlers[method];
    if (!handler) throw new Error(`método inesperado: ${method}`);
    return handler(params);
  }) as MidotecaBridge['invoke'];
  const bridge: MidotecaBridge = {
    invoke,
    onEvent: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    pickDirectory: async () => null,
  };
  return {
    bridge,
    handlers,
    calls,
    emit: (event: DesktopEvent) => listeners.forEach((listener) => listener(event)),
  };
}

async function flush(ticks = 8): Promise<void> {
  for (let i = 0; i < ticks; i++) await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function wireCatalog(handlers: Record<string, (params: unknown) => unknown>) {
  handlers['sources.list'] = () => [coreSource('src-1', '/Volumes/HD')];
  handlers['media.listBySource'] = () => [
    coreMedia('mv1', 'src-1', 'Curso/aula-01.mp4', 'video', 90_000),
    coreMedia('mv2', 'src-1', 'docs/Manual.pdf', 'pdf'),
  ];
  handlers['catalog.listCourses'] = () => ({
    items: [courseSummary('c1', 'Curso Real', 'src-1')],
    total: 1,
    limit: 50,
    offset: 0,
  });
  handlers['catalog.getCourseTree'] = () => ({
    course: {
      id: 'c1',
      title: 'Curso Real',
      description: null,
      metadata: null,
      sourceId: 'src-1',
      relativePath: 'Curso Real',
      detectedTitle: 'Curso Real',
      titleSource: 'detected',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
    documents: [
      {
        id: 'd1',
        mediaFileId: 'mv2',
        title: 'Manual.pdf',
        pageCount: 42,
        titleSource: 'detected',
      },
    ],
    modules: [
      {
        id: 'm1',
        courseId: 'c1',
        title: 'Módulo A',
        sortOrder: 1,
        sortSource: 'detected',
        relativePath: null,
        detectedTitle: null,
        titleSource: 'detected',
        documents: [
          {
            id: 'd1',
            mediaFileId: 'mv2',
            title: 'Manual.pdf',
            pageCount: 42,
            titleSource: 'detected',
          },
        ],
        lessons: [
          {
            id: 'l1',
            moduleId: 'm1',
            title: 'Aula 1',
            sortOrder: 1,
            sortSource: 'detected',
            relativePath: 'aula-01.mp4',
            detectedTitle: null,
            titleSource: 'detected',
            media: [{ lessonId: 'l1', mediaFileId: 'mv1', role: 'primary' }],
          },
        ],
      },
    ],
  });
  handlers['catalog.listDocuments'] = () => ({
    items: [documentSummary('d1', 'Manual.pdf', 'mv2', 42)],
    total: 1,
    limit: 50,
    offset: 0,
  });
}

describe('IpcLibraryRepository', () => {
  it('hidrata o catálogo real a partir do kernel', async () => {
    const delegate = new MockLibraryService();
    const { bridge, handlers } = createFakeBridge();
    wireCatalog(handlers);

    const repository = new IpcLibraryRepository(bridge, delegate);
    repository.hydrate();
    await flush();

    expect(repository.getItems().map((item) => item.id)).toEqual(['c1']);
    expect(repository.getItems('course')).toHaveLength(1);
    expect(repository.getItems('movie')).toEqual([]);
    expect(repository.getCourseById('c1')?.modules[0].lessons[0].duration).toBe(90);
    expect(repository.getCourseById('c1')?.modules[0].documents?.[0].id).toBe('d1');
  });

  it('recarrega o snapshot ao receber eventos do kernel', async () => {
    const delegate = new MockLibraryService();
    const { bridge, handlers, calls, emit } = createFakeBridge();
    wireCatalog(handlers);

    const repository = new IpcLibraryRepository(bridge, delegate);
    let notifications = 0;
    repository.subscribe(() => {
      notifications += 1;
    });
    repository.hydrate();
    await flush();
    const before = calls['catalog.listCourses'];

    emit({
      name: 'media:discovered',
      payload: { mediaId: 'm9', sourceId: 'src-1', relativePath: 'novo.mp4' },
    });
    await flush();

    expect(calls['catalog.listCourses']).toBe(before + 1);
    expect(notifications).toBeGreaterThanOrEqual(2);
  });

  it('delega reprodução, leitura, PDF e busca para o repositório mock', () => {
    const delegate = new MockLibraryService();
    const { bridge, handlers } = createFakeBridge();
    wireCatalog(handlers);
    const repository = new IpcLibraryRepository(bridge, delegate);

    repository.savePlaybackPosition('local', 'l1', 120);
    expect(repository.getPlaybackPosition('local', 'l1')).toBe(120);

    expect(repository.search('react', 'all')).toEqual(delegate.search('react', 'all'));
    expect(repository.search('react', 'all').length).toBeGreaterThan(0);
  });

  it('não tenta buscar páginas de um PDF real pelo repositório mock', async () => {
    const delegate = new MockLibraryService();
    const fetchPages = vi.spyOn(delegate, 'fetchPageRange');
    const { bridge, handlers } = createFakeBridge();
    wireCatalog(handlers);
    const repository = new IpcLibraryRepository(bridge, delegate);

    await expect(repository.fetchPageRange('d1', 1, 3)).resolves.toEqual([]);
    expect(fetchPages).not.toHaveBeenCalled();
  });

  it('persiste a contagem descoberta pelo PDF.js no catálogo real', async () => {
    const { bridge, handlers } = createFakeBridge();
    wireCatalog(handlers);
    handlers['documents.updatePageCount'] = () => undefined;
    const repository = new IpcLibraryRepository(bridge, new MockLibraryService());
    repository.hydrate();
    await flush();

    await repository.saveDocumentPageCount('d1', 13);

    expect(repository.getDocumentById('d1')?.totalPages).toBe(13);
  });

  it('não consulta o kernel em getItems antes do hydrate', () => {
    const delegate = new MockLibraryService();
    const { bridge, handlers } = createFakeBridge();
    wireCatalog(handlers);
    const repository = new IpcLibraryRepository(bridge, delegate);

    expect(repository.getItems()).toEqual([]);
  });
});
