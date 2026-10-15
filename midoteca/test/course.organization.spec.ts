import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  assertOrganizationCoversCourse,
  createMidoteca,
  normalizeReorder,
  planLessonMove,
  NotFoundError,
  ValidationError,
  type Lesson,
  type Midoteca,
} from '../src/index';
import { createTempDatabase, type TempDatabase } from './helpers/temp-db';

function lesson(id: string, sortOrder: number, moduleId = 'm'): Lesson {
  return {
    id,
    moduleId,
    title: id,
    sortOrder,
    sortSource: 'detected',
    relativePath: null,
    detectedTitle: id,
    titleSource: 'detected',
  };
}

describe('course organization (pure rules)', () => {
  it('re-indexes items to match the requested order without changing ids', () => {
    const items = [lesson('a', 0), lesson('b', 1), lesson('c', 2)];
    const ordered = normalizeReorder(items, ['c', 'a', 'b'], 'Lesson');
    expect(ordered.map((i) => i.id)).toEqual(['c', 'a', 'b']);
    expect(ordered.map((i) => i.sortOrder)).toEqual([0, 1, 2]);
  });

  it('rejects reorders with unknown or duplicate ids', () => {
    const items = [lesson('a', 0), lesson('b', 1)];
    expect(() => normalizeReorder(items, ['a', 'z'], 'Lesson')).toThrow(ValidationError);
    expect(() => normalizeReorder(items, ['a', 'a'], 'Lesson')).toThrow(ValidationError);
    expect(() => normalizeReorder(items, ['a'], 'Lesson')).toThrow(ValidationError);
  });

  it('plans a cross-module move with insertion index', () => {
    const source = [lesson('a', 0, 's'), lesson('b', 1, 's')];
    const target = [lesson('x', 0, 't'), lesson('y', 1, 't')];
    const plan = planLessonMove(source, target, 'b', 1);
    expect(plan.sourceRemaining).toEqual(['a']);
    expect(plan.targetOrder).toEqual(['x', 'b', 'y']);
  });

  it('rejects moving a lesson not in the source or duplicated in the target', () => {
    const source = [lesson('a', 0, 's')];
    const target = [lesson('a', 0, 't')];
    expect(() => planLessonMove(source, target, 'a')).toThrow(ValidationError);
    expect(() => planLessonMove(source, [lesson('b', 0, 't')], 'zzz')).toThrow(NotFoundError);
  });

  it('asserts a snapshot covers every module and lesson exactly once', () => {
    expect(() =>
      assertOrganizationCoversCourse(['m1'], ['l1'], [{ id: 'm1', lessonIds: ['l1'] }]),
    ).not.toThrow();
    expect(() =>
      assertOrganizationCoversCourse(['m1'], ['l1'], [{ id: 'm1', lessonIds: [] }]),
    ).toThrow(ValidationError);
    expect(() =>
      assertOrganizationCoversCourse(['m1'], ['l1'], [{ id: 'm1', lessonIds: ['l1', 'l1'] }]),
    ).toThrow(ValidationError);
    expect(() =>
      assertOrganizationCoversCourse(['m1'], ['l1'], [{ id: 'm2', lessonIds: ['l1'] }]),
    ).toThrow(ValidationError);
  });
});

describe('CourseOrganizationService', () => {
  let temp: TempDatabase;
  let app: Midoteca;
  let courseId: string;
  let m1: string;
  let m2: string;

  beforeEach(async () => {
    temp = createTempDatabase();
    app = createMidoteca({ databaseFile: temp.file });
    const course = await app.courses.create({ title: 'Curso' });
    courseId = course.id;
    m1 = (await app.courses.createModule({ courseId, title: 'M1' })).id;
    m2 = (await app.courses.createModule({ courseId, title: 'M2' })).id;
  });

  afterEach(() => {
    app.close();
    temp.cleanup();
  });

  it('renames a module and marks it as a manual edit', async () => {
    const updated = await app.courseOrganization.renameModule(m1, 'Fundamentos');
    expect(updated.title).toBe('Fundamentos');
    expect(updated.titleSource).toBe('manual');
  });

  it('reorders modules atomically and keeps their ids', async () => {
    const ordered = await app.courseOrganization.reorderModules(courseId, [m2, m1]);
    expect(ordered.map((m) => m.id)).toEqual([m2, m1]);
    expect(ordered.map((m) => m.sortOrder)).toEqual([0, 1]);
    expect(ordered.every((m) => m.sortSource === 'manual')).toBe(true);

    const tree = await app.courseOrganization.getCourseTree(courseId);
    expect(tree.modules.map((m) => m.id)).toEqual([m2, m1]);
  });

  it('rejects an invalid reorder without changing the stored order', async () => {
    await expect(app.courseOrganization.reorderModules(courseId, [m1, m1])).rejects.toBeInstanceOf(
      ValidationError,
    );
    const modules = await app.courses.listModules(courseId);
    expect(modules.map((m) => m.id)).toEqual([m1, m2]);
    expect(modules.every((m) => m.sortSource === 'detected')).toBe(true);
  });

  it('reorders lessons within a module', async () => {
    const l1 = (await app.courses.createLesson({ moduleId: m1, title: 'L1' })).id;
    const l2 = (await app.courses.createLesson({ moduleId: m1, title: 'L2' })).id;
    const l3 = (await app.courses.createLesson({ moduleId: m1, title: 'L3' })).id;

    const ordered = await app.courseOrganization.reorderLessons(m1, [l3, l1, l2]);
    expect(ordered.map((l) => l.id)).toEqual([l3, l1, l2]);
    expect((await app.courses.listLessons(m1)).map((l) => l.id)).toEqual([l3, l1, l2]);
  });

  it('moves a lesson to another module, reindexing both sides', async () => {
    const l1 = (await app.courses.createLesson({ moduleId: m1, title: 'L1' })).id;
    const l2 = (await app.courses.createLesson({ moduleId: m1, title: 'L2' })).id;
    const target = (await app.courses.createLesson({ moduleId: m2, title: 'T1' })).id;

    const result = await app.courseOrganization.moveLessonToModule(l2, m2, 0);
    expect(result.sourceModuleId).toBe(m1);
    expect(result.targetModuleId).toBe(m2);
    expect(result.lesson.moduleId).toBe(m2);

    expect((await app.courses.listLessons(m1)).map((l) => l.id)).toEqual([l1]);
    expect((await app.courses.listLessons(m2)).map((l) => l.id)).toEqual([l2, target]);
  });

  it('rejects moving a lesson across courses', async () => {
    const other = await app.courses.create({ title: 'Outro' });
    const otherModule = (await app.courses.createModule({ courseId: other.id, title: 'X' })).id;
    const l1 = (await app.courses.createLesson({ moduleId: m1, title: 'L1' })).id;
    await expect(app.courseOrganization.moveLessonToModule(l1, otherModule)).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it('saves a whole-course organization snapshot (order, titles, moves)', async () => {
    const a = (await app.courses.createLesson({ moduleId: m1, title: 'A' })).id;
    const b = (await app.courses.createLesson({ moduleId: m1, title: 'B' })).id;
    const c = (await app.courses.createLesson({ moduleId: m2, title: 'C' })).id;

    const tree = await app.courseOrganization.saveCourseOrganization({
      courseId,
      modules: [
        { id: m2, title: 'Segundo', lessonIds: [b, c] },
        { id: m1, lessonIds: [a] },
      ],
    });

    expect(tree.modules.map((m) => m.id)).toEqual([m2, m1]);
    expect(tree.modules[0].title).toBe('Segundo');
    expect(tree.modules[0].lessons.map((l) => l.id)).toEqual([b, c]);
    expect(tree.modules[0].lessons[0].moduleId).toBe(m2);
    expect(tree.modules[1].lessons.map((l) => l.id)).toEqual([a]);
    expect(tree.modules[0].sortSource).toBe('manual');
  });

  it('rejects a snapshot that drops or duplicates a lesson', async () => {
    const a = (await app.courses.createLesson({ moduleId: m1, title: 'A' })).id;
    await expect(
      app.courseOrganization.saveCourseOrganization({
        courseId,
        modules: [
          { id: m1, lessonIds: [] },
          { id: m2, lessonIds: [] },
        ],
      }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect((await app.courses.listLessons(m1)).map((l) => l.id)).toEqual([a]);
  });
});
