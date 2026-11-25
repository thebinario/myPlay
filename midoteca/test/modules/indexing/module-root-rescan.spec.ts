import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createMidoteca, type Midoteca } from '../../../src/index';
import { createTempDatabase, type TempDatabase } from '../../helpers/temp-db';
import { createTempLibrary, type TempLibrary } from '../../helpers/temp-library';

const FIXED_MTIME = new Date('2024-01-01T00:00:00.000Z');

/**
 * A source imported pointing at the course folder itself ("Produtividade…",
 * with "Módulo 1…", "Módulo 2…" inside) used to be indexed as one course per
 * module folder. A rescan must turn it into a single course and carry over
 * what the user did on the old rows: progress, completion and manual titles.
 */
describe('rescan of a course whose modules were indexed as courses', () => {
  let temp: TempDatabase;
  let app: Midoteca;
  let library: TempLibrary;
  let sourceId: string;

  beforeEach(async () => {
    temp = createTempDatabase();
    app = createMidoteca({ databaseFile: temp.file });
    library = createTempLibrary();
    library.write('Módulo 1 - Introdução/Boas-vindas.mp4', 'v1', FIXED_MTIME);
    library.write('Módulo 1 - Introdução/Guia de Estudo.pdf', 'pdf', FIXED_MTIME);
    library.write('Módulo 2 - Foco/1. Como focar.mp4', 'v2', FIXED_MTIME);
    library.write('Módulo 2 - Foco/2. Pomodoro.mp4', 'v3', FIXED_MTIME);
    sourceId = (await app.sources.addSource({ rootPath: library.root })).id;
    await app.indexer.runScan({ sourceId });
  });

  afterEach(() => {
    app.close();
    temp.cleanup();
    library.cleanup();
  });

  const db = () => app.database;

  /** Rewinds the catalog to the legacy shape: every module folder is a course. */
  function splitIntoLegacyCourses(): void {
    const [root] = db()
      .prepare(`SELECT id FROM courses WHERE source_id = ? AND relative_path = ''`)
      .all(sourceId) as Array<{ id: string }>;
    const modules = db()
      .prepare('SELECT id, title, relative_path FROM course_modules WHERE course_id = ?')
      .all(root.id) as Array<{ id: string; title: string; relative_path: string }>;
    const now = new Date().toISOString();
    for (const module of modules) {
      const courseId = randomUUID();
      db()
        .prepare(
          `INSERT INTO courses (id, title, created_at, updated_at, source_id, relative_path, detected_title)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(courseId, module.title, now, now, sourceId, module.relative_path, module.title);
      db()
        .prepare(
          `UPDATE course_modules SET course_id = ?, section_id = NULL, title = 'Aulas',
             detected_title = 'Aulas' WHERE id = ?`,
        )
        .run(courseId, module.id);
    }
    db().prepare('DELETE FROM courses WHERE id = ?').run(root.id);
  }

  function lessonOfVideo(fileName: string): { id: string; courseId: string } {
    return db()
      .prepare(
        `SELECT l.id, m.course_id AS courseId FROM lessons l
         JOIN course_modules m ON m.id = l.module_id
         JOIN lesson_media lm ON lm.lesson_id = l.id AND lm.role = 'primary'
         JOIN media_files mf ON mf.id = lm.media_file_id
         WHERE mf.relative_path LIKE ?`,
      )
      .get(`%${fileName}`) as { id: string; courseId: string };
  }

  it('indexes it as one course with the module folders as modules', async () => {
    const courses = await app.courses.listBySource(sourceId);
    expect(courses.map((course) => course.title)).toEqual([expect.any(String)]);
    const modules = await app.courses.listModules(courses[0].id);
    expect(modules.map((module) => module.title).sort()).toEqual([
      'Módulo 1 - Introdução',
      'Módulo 2 - Foco',
    ]);
  });

  it('merges the legacy courses on rescan, keeping progress and manual titles', async () => {
    splitIntoLegacyCourses();
    expect(await app.courses.listBySource(sourceId)).toHaveLength(2);

    const watched = lessonOfVideo('Boas-vindas.mp4');
    await app.watchProgress.setCompletion({ lessonId: watched.id, completed: true });
    await app.watchProgress.savePosition({
      lessonId: lessonOfVideo('Pomodoro.mp4').id,
      positionMs: 42_000,
    });
    db()
      .prepare(`UPDATE courses SET title = 'Foco total', title_source = 'manual' WHERE id = ?`)
      .run(lessonOfVideo('Pomodoro.mp4').courseId);

    await app.indexer.runScan({ sourceId });

    const courses = await app.courses.listBySource(sourceId);
    expect(courses).toHaveLength(1);
    const modules = await app.courses.listModules(courses[0].id);
    expect(modules.map((module) => module.title).sort()).toEqual([
      'Foco total',
      'Módulo 1 - Introdução',
    ]);

    const welcome = lessonOfVideo('Boas-vindas.mp4');
    expect(welcome.courseId).toBe(courses[0].id);
    expect(await app.progress.getPlayback(welcome.id)).toMatchObject({
      completionSource: 'manual',
    });
    expect((await app.progress.getPlayback(welcome.id))?.completedAt).not.toBeNull();
    expect((await app.progress.getPlayback(lessonOfVideo('Pomodoro.mp4').id))?.positionMs).toBe(
      42_000,
    );
  });

  it('keeps a stale course whose lessons were not absorbed (e.g. files gone)', async () => {
    const now = new Date().toISOString();
    const orphan = randomUUID();
    const module = randomUUID();
    db()
      .prepare(
        `INSERT INTO courses (id, title, created_at, updated_at, source_id, relative_path, detected_title)
         VALUES (?, 'Curso antigo', ?, ?, ?, 'Curso antigo', 'Curso antigo')`,
      )
      .run(orphan, now, now, sourceId);
    db()
      .prepare(
        `INSERT INTO course_modules (id, course_id, title, relative_path) VALUES (?, ?, 'Aulas', 'Curso antigo')`,
      )
      .run(module, orphan);
    db()
      .prepare(
        `INSERT INTO lessons (id, module_id, title, relative_path) VALUES (?, ?, 'Aula', 'Curso antigo/a.mp4')`,
      )
      .run(randomUUID(), module);

    await app.indexer.runScan({ sourceId });

    expect((await app.courses.listBySource(sourceId)).map((course) => course.title)).toContain(
      'Curso antigo',
    );
  });
});
