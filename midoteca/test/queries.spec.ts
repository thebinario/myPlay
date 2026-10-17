import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createMidoteca, type Midoteca } from '../src/index';
import { createTempDatabase, type TempDatabase } from './helpers/temp-db';

describe('LibraryQueryService', () => {
  let temp: TempDatabase;
  let app: Midoteca;

  beforeEach(() => {
    temp = createTempDatabase();
    app = createMidoteca({ databaseFile: temp.file });
  });

  afterEach(() => {
    app.close();
    temp.cleanup();
  });

  async function seed(): Promise<string> {
    const source = await app.library.createSource({ rootPath: '/hd' });
    for (let i = 1; i <= 5; i += 1) {
      const course = await app.courses.create({
        title: `Curso ${i}`,
        sourceId: source.id,
        relativePath: `Curso ${i}`,
      });
      const module = await app.courses.createModule({
        courseId: course.id,
        title: 'Mod',
      });
      await app.courses.createLesson({ moduleId: module.id, title: 'Aula' });
    }
    return source.id;
  }

  it('paginates courses with an accurate total and counts', async () => {
    const sourceId = await seed();
    const page = app.queries.listCourses({ sourceId, limit: 2, offset: 0 });
    expect(page.total).toBe(5);
    expect(page.items).toHaveLength(2);
    expect(page.items[0].moduleCount).toBe(1);
    expect(page.items[0].lessonCount).toBe(1);

    const second = app.queries.listCourses({ sourceId, limit: 2, offset: 2 });
    expect(second.items.map((c) => c.title)).toEqual(['Curso 3', 'Curso 4']);
  });

  it('clamps limit to the maximum', async () => {
    await seed();
    const page = app.queries.listCourses({ limit: 10_000 });
    expect(page.limit).toBe(200);
  });

  it('searches indexed catalog entities and returns their paths', async () => {
    const sourceId = await seed();
    const media = await app.media.create({
      sourceId,
      relativePath: 'doc.pdf',
      mediaType: 'pdf',
    });
    await app.documents.create({
      mediaFileId: media.id,
      title: 'Curso Manual',
    });

    const result = app.queries.search('curso');
    expect(result.filter((hit) => hit.kind === 'course')).toHaveLength(5);
    expect(result.find((hit) => hit.kind === 'course')?.filePath).toContain('/hd/Curso 1');
    expect(result.find((hit) => hit.kind === 'document')?.title).toBe('Curso Manual');
    expect(result.find((hit) => hit.kind === 'document')?.filePath).toContain('/hd/doc.pdf');

    expect(app.queries.search('   ')).toHaveLength(0);
    expect(
      app.queries.search('Aula', { filter: 'lesson' }).every((hit) => hit.kind === 'lesson'),
    ).toBe(true);
  });

  it('reports per-source index state', async () => {
    const sourceId = await seed();
    const state = app.queries.getSourceIndexState(sourceId);
    expect(state?.courseCount).toBe(5);
    expect(state?.mediaCount).toBe(0);
    expect(app.queries.getSourceIndexState('missing')).toBeNull();
  });
});
