import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createMidoteca, type Midoteca } from '../../../../src/index';
import { createTempDatabase, type TempDatabase } from '../../../helpers/temp-db';
import { createTempLibrary, type TempLibrary } from '../../../helpers/temp-library';

const MTIME = new Date('2024-01-01T00:00:00.000Z');

/** Opções de curso para uma nova trilha: catálogo real (escaneamento + SQLite). */
describe('study.listCourses — cursos da biblioteca para novas trilhas', () => {
  let temp: TempDatabase;
  let app: Midoteca;
  const libraries: TempLibrary[] = [];

  async function library(
    files: string[],
    options: { displayName?: string; libraryType?: 'course' | 'movie' } = {},
  ) {
    const lib = createTempLibrary();
    libraries.push(lib);
    for (const path of files) lib.write(path, path, MTIME);
    const source = await app.sources.addSource({ rootPath: lib.root, ...options });
    await app.indexer.runScan({ sourceId: source.id });
    return source;
  }

  beforeEach(() => {
    temp = createTempDatabase();
    app = createMidoteca({ databaseFile: temp.file });
  });

  afterEach(() => {
    app.close();
    temp.cleanup();
    for (const lib of libraries.splice(0)) lib.cleanup();
  });

  it('agrupa por biblioteca, com coleção, contagens e cursos avulsos por último', async () => {
    const hacking = await library(
      [
        'Coleção Forense/FOR 508 - Forensics/Day 1/a.mp4',
        'Coleção Forense/FOR 508 - Forensics/Day 2/b.mp4',
        'Android Hacking/01 Modulo 00 - Apresentação/a.mp4',
      ],
      { displayName: 'Hacking' },
    );
    await library(['Filme/Filme.mp4'], { displayName: 'Filmes', libraryType: 'movie' });
    await app.courses.create({ title: 'Inglês técnico' });

    const groups = await app.study.listCourses();

    expect(groups.map((group) => group.libraryName)).toEqual(['Hacking', 'Cursos avulsos']);
    expect(groups[0].sourceId).toBe(hacking.id);
    expect(groups[0].courses.map((course) => [course.title, course.collectionTitle])).toEqual([
      ['Android Hacking', null],
      ['FOR 508 - Forensics', 'Coleção Forense'],
    ]);
    expect(groups[0].courses[1]).toMatchObject({ moduleCount: 2, lessonCount: 2 });
    expect(groups[1]).toMatchObject({ sourceId: null, libraryName: 'Cursos avulsos' });
  });

  it('pesquisa pelo nome do curso ou da biblioteca', async () => {
    await library(['Fluxo/Aula 1.mp4'], { displayName: 'Profissão trader' });
    await library(['Módulo 1 - Introdução/a.mp4', 'Módulo 2 - Foco/b.mp4'], {
      displayName: 'Produtividade e Gestão do Tempo',
    });

    const byLibrary = await app.study.listCourses({ query: 'gestao' });
    expect(byLibrary.map((group) => group.libraryName)).toEqual([
      'Produtividade e Gestão do Tempo',
    ]);
    expect(await app.study.listCourses({ query: 'nada disso' })).toEqual([]);
  });
});
