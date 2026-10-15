import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { rmSync } from 'node:fs';
import { createMidoteca, type Midoteca } from '../src/index';
import { createTempDatabase, type TempDatabase } from './helpers/temp-db';
import { createTempLibrary, type TempLibrary } from './helpers/temp-library';

const FIXED_MTIME = new Date('2024-01-01T00:00:00.000Z');

describe('Indexer (end-to-end)', () => {
  let temp: TempDatabase;
  let app: Midoteca;
  let library: TempLibrary;

  beforeEach(() => {
    temp = createTempDatabase();
    app = createMidoteca({ databaseFile: temp.file });
    library = createTempLibrary();
  });

  afterEach(() => {
    app.close();
    temp.cleanup();
    library.cleanup();
  });

  async function seedCourse(): Promise<string> {
    library.write('Curso A/Modulo 1/01 - Intro.mp4', 'intro', FIXED_MTIME);
    library.write('Curso A/Modulo 1/02 - Setup.mp4', 'setup', FIXED_MTIME);
    library.write('Curso A/Modulo 1/01 - Intro.pt-BR.srt', 'legenda', FIXED_MTIME);
    library.write('Curso A/Modulo 1/Apostila.pdf', 'pdf-1', FIXED_MTIME);
    library.write('Curso A/Apostila Geral.pdf', 'pdf-2', FIXED_MTIME);
    library.write('Solto/manual.pdf', 'pdf-3', FIXED_MTIME);
    const source = await app.sources.addSource({ rootPath: library.root });
    return source.id;
  }

  it('discovers, classifies and organizes a fresh tree', async () => {
    const sourceId = await seedCourse();
    const events: string[] = [];
    app.events.on('index:completed', () => events.push('completed'));
    app.events.on('media:discovered', () => events.push('discovered'));
    app.events.on('course:organized', () => events.push('organized'));

    const summary = await app.indexer.runScan({ sourceId });
    expect(summary.status).toBe('completed');
    expect(summary.created).toBe(6);
    expect(summary.discovered).toBe(6);

    const courses = await app.courses.listBySource(sourceId);
    expect(courses).toHaveLength(1);
    expect(courses[0].title).toBe('Curso A');
    expect(courses[0].titleSource).toBe('detected');

    const modules = await app.courses.listModules(courses[0].id);
    expect(modules.map((m) => m.title)).toEqual(['Modulo 1']);
    const lessons = await app.courses.listLessons(modules[0].id);
    expect(lessons.map((l) => l.title)).toEqual(['Intro', 'Setup']);

    const media = await app.courses.listLessonMedia(lessons[0].id);
    expect(media).toHaveLength(1);
    expect(media[0].role).toBe('primary');

    const documents = app.queries.listDocuments();
    expect(documents.total).toBe(3);

    const tracks = app.database
      .prepare('SELECT kind, language, path FROM media_tracks')
      .all() as Array<{ kind: string; language: string; path: string }>;
    expect(tracks).toEqual([
      {
        kind: 'subtitle',
        language: 'pt-br',
        path: 'Curso A/Modulo 1/01 - Intro.pt-BR.srt',
      },
    ]);

    expect(events).toContain('completed');
    expect(events.filter((e) => e === 'discovered')).toHaveLength(6);
    expect(events.filter((e) => e === 'organized')).toHaveLength(1);

    const state = app.queries.getSourceIndexState(sourceId);
    expect(state?.mediaCount).toBe(6);
    expect(state?.courseCount).toBe(1);
    expect(state?.lastScanAt).toBeTruthy();
  });

  it('is incremental: unchanged files are touched, not duplicated', async () => {
    const sourceId = await seedCourse();
    await app.indexer.runScan({ sourceId });

    const second = await app.indexer.runScan({ sourceId });
    expect(second.unchanged).toBe(6);
    expect(second.created).toBe(0);
    expect(second.missing).toBe(0);

    const count = app.database.prepare('SELECT COUNT(*) AS c FROM media_files').get() as {
      c: number;
    };
    expect(count.c).toBe(6);
  });

  it('detects modified files by size/mtime', async () => {
    const sourceId = await seedCourse();
    await app.indexer.runScan({ sourceId });

    library.write(
      'Curso A/Modulo 1/01 - Intro.mp4',
      'intro-changed-longer',
      new Date('2024-06-01T00:00:00.000Z'),
    );
    const summary = await app.indexer.runScan({ sourceId });
    expect(summary.updated).toBe(1);
    expect(summary.created).toBe(0);
  });

  it('detects a move by unique size+mtime without duplicating', async () => {
    library.write('Curso/Mod/a.mp4', 'move-me', FIXED_MTIME);
    const sourceId = (await app.sources.addSource({ rootPath: library.root })).id;
    await app.indexer.runScan({ sourceId });

    library.write('Curso/Mod/b.mp4', 'move-me', FIXED_MTIME);
    rmSync(`${library.root}/Curso/Mod/a.mp4`);

    const summary = await app.indexer.runScan({ sourceId });
    expect(summary.moved).toBe(1);
    expect(summary.created).toBe(0);

    const rows = app.database.prepare('SELECT relative_path FROM media_files').all() as Array<{
      relative_path: string;
    }>;
    expect(rows.map((r) => r.relative_path)).toEqual(['Curso/Mod/b.mp4']);
  });

  it('flags missing files without deleting rows or touching disk', async () => {
    const sourceId = await seedCourse();
    await app.indexer.runScan({ sourceId });

    const removed = `${library.root}/Curso A/Modulo 1/02 - Setup.mp4`;
    rmSync(removed);

    const summary = await app.indexer.runScan({ sourceId });
    expect(summary.missing).toBe(1);

    const row = app.database
      .prepare(
        "SELECT availability FROM media_files WHERE relative_path = 'Curso A/Modulo 1/02 - Setup.mp4'",
      )
      .get() as { availability: string };
    expect(row.availability).toBe('missing');
  });

  it('marks the source offline when the root is unavailable', async () => {
    const sourceId = await seedCourse();
    await app.indexer.runScan({ sourceId });
    rmSync(library.root, { recursive: true, force: true });

    const summary = await app.indexer.runScan({ sourceId });
    expect(summary.status).toBe('source-unavailable');
    expect((await app.sources.getSource(sourceId)).status).toBe('offline');
  });

  it('respects cancellation and preserves catalog state', async () => {
    const sourceId = await seedCourse();
    const controller = new AbortController();
    controller.abort();
    const summary = await app.indexer.runScan({
      sourceId,
      signal: controller.signal,
    });
    expect(summary.status).toBe('cancelled');
    expect((await app.sources.getSource(sourceId)).status).toBe('active');
  });

  describe('title precedence (manual > manifest > detected)', () => {
    it('uses the manifest title when present', async () => {
      const sourceId = await seedCourse();
      library.write(
        'Curso A/.midoteca/course.json',
        JSON.stringify({ version: 1, course: { title: 'Curso Renomeado' } }),
      );
      await app.indexer.runScan({ sourceId });

      const course = await app.courses.findBySourceAndPath(sourceId, 'Curso A');
      expect(course?.title).toBe('Curso Renomeado');
      expect(course?.titleSource).toBe('manifest');
      expect(course?.detectedTitle).toBe('Curso A');
    });

    it('never overwrites a manual title on rescan', async () => {
      const sourceId = await seedCourse();
      await app.indexer.runScan({ sourceId });
      const course = await app.courses.findBySourceAndPath(sourceId, 'Curso A');
      await app.courses.update({ id: course!.id, title: 'Meu Titulo' });
      expect((await app.courses.findById(course!.id))?.titleSource).toBe('manual');

      await app.indexer.runScan({ sourceId });
      const after = await app.courses.findById(course!.id);
      expect(after?.title).toBe('Meu Titulo');
      expect(after?.titleSource).toBe('manual');
    });
  });

  describe('manual order precedence', () => {
    it('never overwrites a manual lesson order on rescan', async () => {
      const sourceId = await seedCourse();
      await app.indexer.runScan({ sourceId });

      const course = (await app.courses.listBySource(sourceId))[0];
      const module = (await app.courses.listModules(course.id))[0];
      const before = await app.courses.listLessons(module.id);
      expect(before.map((l) => l.title)).toEqual(['Intro', 'Setup']);

      const reversed = [...before].reverse().map((l) => l.id);
      await app.courseOrganization.reorderLessons(module.id, reversed);

      await app.indexer.runScan({ sourceId });

      const after = await app.courses.listLessons(module.id);
      expect(after.map((l) => l.id)).toEqual(reversed);
      expect(after.every((l) => l.sortSource === 'manual')).toBe(true);
    });

    it('never overwrites a manual module order on rescan', async () => {
      library.write('Curso B/Modulo A/a.mp4', 'a', FIXED_MTIME);
      library.write('Curso B/Modulo B/b.mp4', 'b', FIXED_MTIME);
      const sourceId = (await app.sources.addSource({ rootPath: library.root })).id;
      await app.indexer.runScan({ sourceId });

      const course = (await app.courses.listBySource(sourceId))[0];
      const modules = await app.courses.listModules(course.id);
      const reversed = [...modules].reverse().map((m) => m.id);
      await app.courseOrganization.reorderModules(course.id, reversed);

      await app.indexer.runScan({ sourceId });

      const after = await app.courses.listModules(course.id);
      expect(after.map((m) => m.id)).toEqual(reversed);
      expect(after.every((m) => m.sortSource === 'manual')).toBe(true);
    });
  });
});
