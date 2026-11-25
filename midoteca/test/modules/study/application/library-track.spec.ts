import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createMidoteca, type Midoteca } from '../../../../src/index';
import { ConflictError, ValidationError } from '../../../../src/core/errors';
import { createTempDatabase, type TempDatabase } from '../../../helpers/temp-db';
import { createTempLibrary, type TempLibrary } from '../../../helpers/temp-library';

const MTIME = new Date('2024-01-01T00:00:00.000Z');
const MIN = 60_000;

/** Trilha de uma biblioteca inteira (todos os cursos dela), com escaneamento real. */
describe('study — trilha de biblioteca inteira', () => {
  let temp: TempDatabase;
  let app: Midoteca;
  let library: TempLibrary;
  let sourceId: string;
  let now: Date;

  beforeEach(async () => {
    temp = createTempDatabase();
    now = new Date(2026, 10, 25, 19, 0); // quarta-feira
    app = createMidoteca({ databaseFile: temp.file, clock: () => now });
    library = createTempLibrary();
    library.write('Android Hacking/Módulo 1/Aula 1.mp4', 'a1', MTIME);
    library.write('Android Hacking/Módulo 1/Aula 2.mp4', 'a2', MTIME);
    library.write('Web Hacking/Módulo 1/Aula 1.mp4', 'w1', MTIME);
    library.write('Web Hacking/Módulo 1/Aula 2.mp4', 'w2', MTIME);
    sourceId = (await app.sources.addSource({ rootPath: library.root, displayName: 'Hacking' })).id;
    await app.indexer.runScan({ sourceId });
  });

  afterEach(() => {
    app.close();
    temp.cleanup();
    library.cleanup();
  });

  async function lesson(courseTitle: string, lessonTitle: string) {
    const course = (await app.courses.listBySource(sourceId)).find((c) => c.title === courseTitle)!;
    const [module] = await app.courses.listModules(course.id);
    const found = (await app.courses.listLessons(module.id)).find((l) => l.title === lessonTitle)!;
    return { courseId: course.id, lessonId: found.id };
  }

  it('cria a trilha da biblioteca e impede duas trilhas ativas para a mesma biblioteca', async () => {
    const track = await app.study.saveTrack({ title: 'Hacking', kind: 'course', sourceId });
    expect(track).toMatchObject({ kind: 'course', sourceId, courseId: null });

    await expect(
      app.study.saveTrack({ title: 'De novo', kind: 'course', sourceId }),
    ).rejects.toThrow(ConflictError);
    await expect(
      app.study.saveTrack({ title: 'X', kind: 'course', sourceId: 'nao-existe' }),
    ).rejects.toThrow(ValidationError);
    await expect(app.study.saveTrack({ title: 'X', kind: 'course' })).rejects.toThrow(
      /curso ou a biblioteca/i,
    );
  });

  it('o tempo do player em qualquer curso da biblioteca vai para a trilha dela', async () => {
    const track = await app.study.saveTrack({ title: 'Hacking', kind: 'course', sourceId });
    await app.study.recordPlayerTime({
      lessonId: (await lesson('Web Hacking', 'Aula 1')).lessonId,
      playedMs: 10 * MIN,
    });

    expect((await app.study.listTracks()).map((t) => t.id)).toEqual([track.id]);
    const day = await app.study.getDay();
    expect(day.loggedMinutes).toBe(10);
  });

  it('a trilha de um curso específico tem prioridade sobre a da biblioteca', async () => {
    await app.study.saveTrack({ title: 'Hacking', kind: 'course', sourceId });
    const web = await lesson('Web Hacking', 'Aula 1');
    const webTrack = await app.study.saveTrack({
      title: 'Web',
      kind: 'course',
      courseId: web.courseId,
    });
    await app.study.recordPlayerTime({ lessonId: web.lessonId, playedMs: 5 * MIN });

    const day = await app.study.getDay();
    expect(day.sessions.map((s) => s.trackId)).toEqual([webTrack.id]);
  });

  it('continua do curso assistido por último na biblioteca', async () => {
    const track = await app.study.saveTrack({ title: 'Hacking', kind: 'course', sourceId });
    await app.study.saveSchedule({
      blocks: [{ trackId: track.id, weekday: 3, startMinute: 19 * 60, durationMinutes: 60 }],
    });

    let block = (await app.study.getDay()).blocks[0];
    expect(block.nextLesson).toMatchObject({ title: 'Aula 1', courseTitle: 'Android Hacking' });

    const web = await lesson('Web Hacking', 'Aula 1');
    await app.watchProgress.setCompletion({ lessonId: web.lessonId, completed: true });

    block = (await app.study.getDay()).blocks[0];
    expect(block.nextLesson).toMatchObject({
      courseId: web.courseId,
      courseTitle: 'Web Hacking',
      title: 'Aula 2',
    });
  });
});
