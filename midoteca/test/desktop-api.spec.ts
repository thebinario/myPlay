import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, rmSync } from 'node:fs';
import { createMidoteca, type Midoteca } from '../src/index';
import { createDesktopApi, type DesktopApi, type DesktopResponse } from '../src/index';
import { createTempDatabase, type TempDatabase } from './helpers/temp-db';
import { createTempLibrary, type TempLibrary } from './helpers/temp-library';

const FIXED_MTIME = new Date('2024-01-01T00:00:00.000Z');

/** Unwraps a successful response or throws with the serialized error. */
function unwrap<T>(response: DesktopResponse): T {
  if (!response.ok) throw new Error(`RPC failed: ${response.error.kind} ${response.error.message}`);
  return response.data as T;
}

describe('desktop API (RPC surface)', () => {
  let temp: TempDatabase;
  let app: Midoteca;
  let api: DesktopApi;
  let library: TempLibrary;

  beforeEach(() => {
    temp = createTempDatabase();
    app = createMidoteca({ databaseFile: temp.file });
    api = createDesktopApi(app);
    library = createTempLibrary();
  });

  afterEach(() => {
    app.close();
    temp.cleanup();
    library.cleanup();
  });

  async function scanFixture(): Promise<string> {
    library.write('Curso A/Modulo 1/01 - Intro.mp4', 'intro', FIXED_MTIME);
    library.write('Curso A/Modulo 1/02 - Setup.mp4', 'setup', FIXED_MTIME);
    library.write('Curso A/Modulo 1/Apostila.pdf', 'pdf-1', FIXED_MTIME);
    const source = unwrap<{ id: string }>(
      await api.handle({ method: 'sources.add', params: { rootPath: library.root } }),
    );
    unwrap(await api.handle({ method: 'indexing.scan', params: { sourceId: source.id } }));
    return source.id;
  }

  it('reports system info without leaking Node objects', async () => {
    const info = unwrap<{ databaseFile: string; schemaVersion: number }>(
      await api.handle({ method: 'system.info' }),
    );
    expect(info.databaseFile).toBe(temp.file);
    expect(info.schemaVersion).toBeGreaterThan(0);
  });

  it('adds a source, scans it and exposes the catalog via queries', async () => {
    const sourceId = await scanFixture();

    const courses = unwrap<{ items: Array<{ id: string; title: string }>; total: number }>(
      await api.handle({ method: 'catalog.listCourses', params: { sourceId } }),
    );
    expect(courses.total).toBe(1);
    expect(courses.items[0].title).toBe('Curso A');

    const tree = unwrap<{ modules: Array<{ lessons: unknown[] }> }>(
      await api.handle({
        method: 'catalog.getCourseTree',
        params: { courseId: courses.items[0].id },
      }),
    );
    expect(tree.modules).toHaveLength(1);
    expect(tree.modules[0].lessons).toHaveLength(2);

    const documents = unwrap<{ total: number }>(
      await api.handle({ method: 'catalog.listDocuments', params: { sourceId } }),
    );
    expect(documents.total).toBe(1);

    const search = unwrap<{ courses: unknown[]; documents: unknown[] }>(
      await api.handle({ method: 'catalog.search', params: { text: 'Curso' } }),
    );
    expect(search.courses.length).toBeGreaterThan(0);
  });

  it('persists playback and reading progress across calls', async () => {
    const sourceId = await scanFixture();
    const courses = unwrap<{ items: Array<{ id: string }> }>(
      await api.handle({ method: 'catalog.listCourses', params: { sourceId } }),
    );
    const tree = unwrap<{ modules: Array<{ lessons: Array<{ id: string }> }> }>(
      await api.handle({
        method: 'catalog.getCourseTree',
        params: { courseId: courses.items[0].id },
      }),
    );
    const lessonId = tree.modules[0].lessons[0].id;

    unwrap(
      await api.handle({
        method: 'progress.savePlayback',
        params: { lessonId, positionMs: 42_000, durationMs: 60_000 },
      }),
    );
    const playback = unwrap<{ positionMs: number }>(
      await api.handle({ method: 'progress.getPlayback', params: { lessonId } }),
    );
    expect(playback.positionMs).toBe(42_000);

    const documents = unwrap<{ items: Array<{ id: string }> }>(
      await api.handle({ method: 'catalog.listDocuments', params: { sourceId } }),
    );
    const documentId = documents.items[0].id;
    unwrap(
      await api.handle({
        method: 'progress.saveReading',
        params: { documentId, page: 7, scrollRatio: 0.4, zoom: 1.25 },
      }),
    );
    const reading = unwrap<{ page: number; zoom: number }>(
      await api.handle({ method: 'progress.getReading', params: { documentId } }),
    );
    expect(reading.page).toBe(7);
    expect(reading.zoom).toBe(1.25);
  });

  it('persists PDF page count discovered by the renderer', async () => {
    const sourceId = await scanFixture();
    const listed = unwrap<{ items: Array<{ id: string; pageCount: number | null }> }>(
      await api.handle({ method: 'catalog.listDocuments', params: { sourceId } }),
    );
    const documentId = listed.items[0].id;

    unwrap(await api.handle({
      method: 'documents.updatePageCount',
      params: { documentId, pageCount: 13 },
    }));

    const updated = unwrap<{ items: Array<{ pageCount: number | null }> }>(
      await api.handle({ method: 'catalog.listDocuments', params: { sourceId } }),
    );
    expect(updated.items[0].pageCount).toBe(13);
  });

  it('stores settings as JSON values', async () => {
    unwrap(
      await api.handle({
        method: 'settings.set',
        params: { key: 'playback.speed', value: '1.5' },
      }),
    );
    const setting = unwrap<{ value: string }>(
      await api.handle({ method: 'settings.get', params: { key: 'playback.speed' } }),
    );
    expect(setting.value).toBe('1.5');

    const all = unwrap<unknown[]>(await api.handle({ method: 'settings.list' }));
    expect(all).toHaveLength(1);
  });

  it('marks a source offline when the drive disappears, keeping its catalog', async () => {
    const sourceId = await scanFixture();
    rmSync(library.root, { recursive: true, force: true });

    const checked = unwrap<{ status: string }>(
      await api.handle({ method: 'sources.check', params: { sourceId } }),
    );
    expect(checked.status).toBe('offline');

    const courses = unwrap<{ total: number }>(
      await api.handle({ method: 'catalog.listCourses', params: { sourceId } }),
    );
    expect(courses.total).toBe(1);
  });

  it('removes only the catalog entry, never the physical files', async () => {
    const sourceId = await scanFixture();
    const filesStillThere = existsSync(library.root);
    expect(filesStillThere).toBe(true);

    unwrap(await api.handle({ method: 'sources.remove', params: { sourceId } }));

    const sources = unwrap<unknown[]>(await api.handle({ method: 'sources.list' }));
    expect(sources).toHaveLength(0);
    expect(existsSync(library.root)).toBe(true);
  });

  it('returns serialized errors instead of throwing', async () => {
    const missing = await api.handle({
      method: 'sources.add',
      params: { rootPath: '/definitely/does/not/exist' },
    });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.error.kind).toBe('not_found');

    const unknown = await api.handle({ method: 'nope' as never });
    expect(unknown.ok).toBe(false);
    if (!unknown.ok) expect(unknown.error.kind).toBe('validation');
  });
});
