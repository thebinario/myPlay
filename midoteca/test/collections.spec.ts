import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createMidoteca, type Midoteca } from '../src/index';
import { createTempDatabase, type TempDatabase } from './helpers/temp-db';
import { createTempLibrary, type TempLibrary } from './helpers/temp-library';

const FIXED_MTIME = new Date('2024-01-01T00:00:00.000Z');

describe('Collections (end-to-end)', () => {
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

  async function seedCollections(): Promise<string> {
    const base =
      'Coleção 01 - Tecnologia/Programação Front-end/Udemy/Curso 01 - Lógica de Programação';
    library.write(`${base}/Aulas/Aula 01 - Boas-vindas.webm`, 'v1', FIXED_MTIME);
    library.write(`${base}/Aulas/Aula 02 - Lógica 720p.mp4`, 'v2', FIXED_MTIME);
    library.write(`${base}/Aulas/Aula 02 - Lógica 1080p (Cópia).mp4`, 'v3', FIXED_MTIME);
    library.write(`${base}/Aulas/Apostila.pdf`, 'pdf-1', FIXED_MTIME);
    library.write(`${base}/03 - Ao Vivo/Aula 03 - Vídeo 540p.ts`, 'v4', FIXED_MTIME);
    library.write(`${base}/03 - Ao Vivo/Apostila 05 - Resumo.pdf`, 'pdf-2', FIXED_MTIME);
    const source = await app.sources.addSource({ rootPath: library.root });
    return source.id;
  }

  it('persists collections, facets, sections and deduplicated lessons', async () => {
    const sourceId = await seedCollections();
    const summary = await app.indexer.runScan({ sourceId });
    expect(summary.status).toBe('completed');

    const collections = app.queries.listCollections({ sourceId });
    expect(collections.total).toBe(1);
    expect(collections.items[0].title).toBe('Coleção 01 - Tecnologia');
    expect(collections.items[0].courseCount).toBe(1);

    const tree = app.queries.getCollectionTree(collections.items[0].id);
    expect(tree).not.toBeNull();
    expect(tree?.courses).toHaveLength(1);

    const course = tree!.courses[0];
    expect(course.title).toBe('Curso 01 - Lógica de Programação');
    expect(course.category).toBe('Programação Front-end');
    expect(course.provider).toBe('Udemy');
    expect(course.lessonCount).toBe(3);
    expect(course.documentCount).toBe(2);

    const sectionTitles = course.sections.map((section) => section.title).sort();
    expect(sectionTitles).toEqual(['Ao Vivo', 'Aulas']);

    const aulas = course.sections.find((section) => section.title === 'Aulas')!;
    expect(aulas.modules[0].lessonCount).toBe(2);
    expect(aulas.modules[0].documentCount).toBe(1);

    const aoVivo = course.sections.find((section) => section.title === 'Ao Vivo')!;
    expect(aoVivo.modules[0].lessonCount).toBe(1);
    expect(aoVivo.modules[0].documentCount).toBe(1);
  });

  it('exposes sections and the collection id on the course tree', async () => {
    const sourceId = await seedCollections();
    await app.indexer.runScan({ sourceId });

    const courses = await app.courses.listBySource(sourceId);
    expect(courses).toHaveLength(1);
    expect(courses[0].collectionId).not.toBeNull();

    const tree = await app.courses.getTree(courses[0].id);
    expect(tree).not.toBeNull();
    expect(tree!.sections.map((section) => section.title).sort()).toEqual(['Ao Vivo', 'Aulas']);

    const aulas = tree!.sections.find((section) => section.title === 'Aulas')!;
    expect(aulas.modules).toHaveLength(1);
    expect(aulas.modules[0].lessons).toHaveLength(2);
    // Flat projection still lists every module for legacy consumers.
    expect(tree!.modules.map((module) => module.title)).toEqual(['Aulas', 'Aulas']);
  });

  it('agrega duração e progresso da coleção no read model', async () => {
    const sourceId = await seedCollections();
    await app.indexer.runScan({ sourceId });

    const courses = await app.courses.listBySource(sourceId);
    const tree = await app.courses.getTree(courses[0].id);
    const lessonId = tree!.modules.flatMap((module) => module.lessons)[0].id;
    await app.progress.savePlayback({
      lessonId,
      positionMs: 1000,
      completedAt: FIXED_MTIME.toISOString(),
    });

    const summary = app.queries.listCollections({ sourceId }).items[0];
    expect(typeof summary.totalDurationSeconds).toBe('number');
    // 3 aulas + 2 PDFs no curso; uma aula concluída => 20%.
    expect(summary.progress).toBe(20);
  });

  it('detects the collection when the source root is the collection folder', async () => {
    const root = library.mkdir('Coleção 02 - Negócios e Criativo');
    const base = 'Design/Domestika/Curso 04 - UI';
    library.write(
      `Coleção 02 - Negócios e Criativo/${base}/Aulas/Aula 01 - Intro.mp4`,
      'v1',
      FIXED_MTIME,
    );
    library.write(
      `Coleção 02 - Negócios e Criativo/${base}/Aulas/Aula 02 - Fim.mp4`,
      'v2',
      FIXED_MTIME,
    );
    const source = await app.sources.addSource({ rootPath: root });
    const summary = await app.indexer.runScan({ sourceId: source.id });
    expect(summary.status).toBe('completed');

    const collections = app.queries.listCollections({ sourceId: source.id });
    expect(collections.total).toBe(1);
    expect(collections.items[0].title).toBe('Coleção 02 - Negócios e Criativo');
    expect(collections.items[0].courseCount).toBe(1);

    const tree = app.queries.getCollectionTree(collections.items[0].id)!;
    expect(tree.courses).toHaveLength(1);
    const course = tree.courses[0];
    expect(course.title).toBe('Curso 04 - UI');
    expect(course.category).toBe('Design');
    expect(course.provider).toBe('Domestika');

    const courses = await app.courses.listBySource(source.id);
    expect(courses).toHaveLength(1);
    expect(courses[0].collectionId).toBe(collections.items[0].id);
  });

  it('detects the course when the source root is the course folder', async () => {
    const root = library.mkdir('Curso 01 - Lógica de Programação');
    library.write('Curso 01 - Lógica de Programação/Aulas/Aula 01 - Intro.mp4', 'v1', FIXED_MTIME);
    library.write('Curso 01 - Lógica de Programação/Aulas/Aula 02 - Fim.mp4', 'v2', FIXED_MTIME);
    const source = await app.sources.addSource({ rootPath: root });
    await app.indexer.runScan({ sourceId: source.id });

    expect(app.queries.listCollections({ sourceId: source.id }).total).toBe(0);

    const courses = await app.courses.listBySource(source.id);
    expect(courses).toHaveLength(1);
    expect(courses[0].title).toBe('Curso 01 - Lógica de Programação');
    expect(courses[0].collectionId).toBeNull();

    const tree = await app.courses.getTree(courses[0].id);
    expect(tree!.sections.map((section) => section.title)).toEqual(['Aulas']);
  });

  it('returns null for an unknown collection', () => {
    expect(app.queries.getCollectionTree('missing')).toBeNull();
    expect(app.queries.listCollections().total).toBe(0);
  });
});
