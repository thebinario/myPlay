import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createMidoteca, type Midoteca } from '../../../src/index';
import { createTempDatabase, type TempDatabase } from '../../helpers/temp-db';
import { createTempLibrary, type TempLibrary } from '../../helpers/temp-library';

const FIXED_MTIME = new Date('2024-01-01T00:00:00.000Z');

/**
 * Libraries indexed before module detection keep every lesson of a flat folder
 * in the implicit "Aulas" module. A rescan must regroup them without creating
 * new lessons (progress is keyed by lesson id) and without leaving the old,
 * now empty, implicit module behind.
 */
describe('rescan of a flat folder after module detection', () => {
  let temp: TempDatabase;
  let app: Midoteca;
  let library: TempLibrary;

  beforeEach(() => {
    temp = createTempDatabase();
    app = createMidoteca({ databaseFile: temp.file });
    library = createTempLibrary();
    library.write('Mesa/01 - Clube - Live 01-09-2023.mp4', 'live', FIXED_MTIME);
    library.write('Mesa/02 - Clube - Aula 01 - Boas-vindas.mp4', 'a1', FIXED_MTIME);
    library.write('Mesa/03 - Clube - Aula 02 - Módulo 2 - Macro.mp4', 'a2', FIXED_MTIME);
    library.write('Mesa/04 - Clube - Aula 03 - Juros.mp4', 'a3', FIXED_MTIME);
    library.write('Mesa/05 - Série X - Ep.1 - Abertura - audio.mp4', 'e1a', FIXED_MTIME);
    library.write('Mesa/06 - Série X - Ep.1 - Abertura - 1080p.mp4', 'e1v', FIXED_MTIME);
    library.write('Mesa/Aula 03 - Juros.pdf', 'pdf', FIXED_MTIME);
  });

  afterEach(() => {
    app.close();
    temp.cleanup();
    library.cleanup();
  });

  async function scan(): Promise<string> {
    const existing = await app.sources.listSources();
    const sourceId =
      existing[0]?.id ?? (await app.sources.addSource({ rootPath: library.root })).id;
    await app.indexer.runScan({ sourceId });
    return (await app.courses.listBySource(sourceId))[0].id;
  }

  async function tree(courseId: string) {
    const modules = await app.courses.listModules(courseId);
    return Promise.all(
      modules.map(async (module) => ({
        id: module.id,
        title: module.title,
        lessons: (await app.courses.listLessons(module.id)).map((l) => l.id),
      })),
    );
  }

  /** Rewinds the catalog to the pre-detection shape: one implicit module. */
  function collapseIntoLegacyModule(courseId: string): string {
    const db = app.database;
    const sectionId = (
      db
        .prepare('SELECT section_id FROM course_modules WHERE course_id = ? LIMIT 1')
        .get(courseId) as { section_id: string | null }
    ).section_id;
    const legacyId = randomUUID();
    db.prepare(
      `INSERT INTO course_modules
         (id, course_id, title, sort_order, sort_source, relative_path, detected_title, title_source, section_id)
       VALUES (?, ?, 'Aulas', 0, 'detected', 'Mesa', 'Aulas', 'detected', ?)`,
    ).run(legacyId, courseId, sectionId);
    db.prepare(
      `UPDATE lessons SET module_id = ?
        WHERE module_id IN (SELECT id FROM course_modules WHERE course_id = ? AND id <> ?)`,
    ).run(legacyId, courseId, legacyId);
    db.prepare('DELETE FROM course_modules WHERE course_id = ? AND id <> ?').run(
      courseId,
      legacyId,
    );
    return legacyId;
  }

  it('moves the existing lessons into the detected modules, keeping their ids', async () => {
    const courseId = await scan();
    const legacyId = collapseIntoLegacyModule(courseId);
    const legacyLessons = (await tree(courseId))[0].lessons;
    expect(legacyLessons).toHaveLength(6);

    await scan();

    const after = await tree(courseId);
    expect(after.map((m) => m.title)).toEqual(['Lives', 'Módulo 1', 'Módulo 2 - Macro', 'Série X']);
    expect(after.map((m) => m.id)).not.toContain(legacyId);
    expect(after.flatMap((m) => m.lessons).sort()).toEqual([...legacyLessons].sort());
    const lessonCount = app.database.prepare('SELECT COUNT(*) AS c FROM lessons').get() as {
      c: number;
    };
    expect(lessonCount.c).toBe(6);
  });

  it('links "Aula NN" materials to the detected module', async () => {
    const courseId = await scan();
    const second = (await tree(courseId)).find((m) => m.title === 'Módulo 2 - Macro')!;
    const linked = app.database
      .prepare('SELECT COUNT(*) AS c FROM document_links WHERE module_id = ?')
      .get(second.id) as { c: number };
    expect(linked.c).toBe(1);
  });

  it('never takes back a lesson the user moved to another module', async () => {
    const courseId = await scan();
    const [lives, first] = await tree(courseId);
    await app.courseOrganization.moveLessonToModule(lives.lessons[0], first.id);

    await scan();

    const after = await tree(courseId);
    expect(after.find((m) => m.id === first.id)!.lessons).toContain(lives.lessons[0]);
    expect(after.flatMap((m) => m.lessons)).toHaveLength(6);
  });
});
