import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createMidoteca, type Midoteca } from '../../../src/index';
import { createTempDatabase, type TempDatabase } from '../../helpers/temp-db';
import { createTempLibrary, type TempLibrary } from '../../helpers/temp-library';

const FIXED_MTIME = new Date('2024-01-01T00:00:00.000Z');
const MODULE_FOLDERS = [
  'Bônus',
  'Módulo 1 - Introdução',
  'Módulo 10 - Bônus',
  'Modulo 2 - Alta Performance',
  'Módulo 3 - Priorização',
];
const EXPECTED = [
  'Módulo 1 - Introdução',
  'Modulo 2 - Alta Performance',
  'Módulo 3 - Priorização',
  'Módulo 10 - Bônus',
  'Bônus',
];

describe('Ordenação do catálogo (escaneamento real + SQLite)', () => {
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

  it('lista cursos numerados em ordem numérica e os sem número por último', async () => {
    for (const folder of MODULE_FOLDERS) {
      library.write(`${folder}/Aula A.mp4`, `${folder}-a`, FIXED_MTIME);
      library.write(`${folder}/Aula B.mp4`, `${folder}-b`, FIXED_MTIME);
    }
    const source = await app.sources.addSource({ rootPath: library.root });
    await app.indexer.runScan({ sourceId: source.id });

    const all = app.queries.listCourses({ sourceId: source.id, limit: 50 });
    expect(all.items.map((course) => course.title)).toEqual(EXPECTED);

    const page = app.queries.listCourses({ sourceId: source.id, limit: 2, offset: 2 });
    expect(page.total).toBe(5);
    expect(page.items.map((course) => course.title)).toEqual(EXPECTED.slice(2, 4));
  });

  it('ordena os módulos e as aulas da árvore do curso pela mesma regra', async () => {
    const folders = MODULE_FOLDERS.map((f) => (f === 'Bônus' ? 'Módulo Bônus' : f));
    for (const folder of folders) {
      library.write(`Curso X/${folder}/Aula 10.mp4`, `${folder}-10`, FIXED_MTIME);
      library.write(`Curso X/${folder}/Aula 2.mp4`, `${folder}-2`, FIXED_MTIME);
      library.write(`Curso X/${folder}/Extra.mp4`, `${folder}-x`, FIXED_MTIME);
    }
    const source = await app.sources.addSource({ rootPath: library.root });
    await app.indexer.runScan({ sourceId: source.id });

    const [course] = app.queries.listCourses({ sourceId: source.id, limit: 10 }).items;
    const tree = await app.courses.getTree(course.id);
    expect(tree?.modules.map((module) => module.title)).toEqual([
      ...EXPECTED.slice(0, 4),
      'Módulo Bônus',
    ]);
    expect(tree?.modules[0].lessons.map((lesson) => lesson.title)).toEqual([
      'Aula 2',
      'Aula 10',
      'Extra',
    ]);
  });
});
