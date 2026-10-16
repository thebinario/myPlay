import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createMidoteca, ConflictError, type Midoteca } from '../src/index';
import { createTempDatabase, type TempDatabase } from './helpers/temp-db';

describe('course repository', () => {
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

  it('creates, reads and lists courses', async () => {
    const created = await app.courses.create({
      title: 'Arquitetura Desktop',
      description: 'Curso de exemplo',
      metadata: { tags: ['tauri', 'react'] },
    });

    const found = await app.courses.findById(created.id);
    expect(found?.title).toBe('Arquitetura Desktop');
    expect(found?.metadata).toEqual({ tags: ['tauri', 'react'] });
    expect(await app.courses.list()).toHaveLength(1);
  });

  it('returns null for an unknown course', async () => {
    expect(await app.courses.findById('missing')).toBeNull();
  });

  it('updates a course and rejects unknown ids', async () => {
    const course = await app.courses.create({ title: 'Original' });
    const updated = await app.courses.update({ id: course.id, title: 'Renomeado' });
    expect(updated.title).toBe('Renomeado');
    await expect(app.courses.update({ id: 'missing', title: 'x' })).rejects.toThrow();
  });

  it('auto-increments module and lesson sort order', async () => {
    const course = await app.courses.create({ title: 'Curso' });
    const m1 = await app.courses.createModule({ courseId: course.id, title: 'M1' });
    const m2 = await app.courses.createModule({ courseId: course.id, title: 'M2' });
    expect([m1.sortOrder, m2.sortOrder]).toEqual([0, 1]);

    const l1 = await app.courses.createLesson({ moduleId: m1.id, title: 'L1' });
    const l2 = await app.courses.createLesson({ moduleId: m1.id, title: 'L2' });
    expect([l1.sortOrder, l2.sortOrder]).toEqual([0, 1]);
  });

  it('associates multiple media files with a lesson', async () => {
    const source = await app.library.createSource({ rootPath: '/Volumes/HD' });
    const video = await app.media.create({
      sourceId: source.id,
      relativePath: 'aula1/video.mp4',
      mediaType: 'video',
    });
    const pdf = await app.media.create({
      sourceId: source.id,
      relativePath: 'aula1/material.pdf',
      mediaType: 'pdf',
    });

    const course = await app.courses.create({ title: 'Curso' });
    const module = await app.courses.createModule({ courseId: course.id, title: 'M1' });
    const lesson = await app.courses.createLesson({ moduleId: module.id, title: 'L1' });

    await app.courses.attachMedia({
      lessonId: lesson.id,
      mediaFileId: video.id,
      role: 'primary',
    });
    await app.courses.attachMedia({
      lessonId: lesson.id,
      mediaFileId: pdf.id,
      role: 'attachment',
    });

    const links = await app.courses.listLessonMedia(lesson.id);
    expect(links).toHaveLength(2);
    expect(links.map((l) => l.role).sort()).toEqual(['attachment', 'primary']);
  });

  it('rejects duplicate lesson/media/role associations', async () => {
    const source = await app.library.createSource({ rootPath: '/Volumes/HD' });
    const media = await app.media.create({
      sourceId: source.id,
      relativePath: 'v.mp4',
      mediaType: 'video',
    });
    const course = await app.courses.create({ title: 'Curso' });
    const module = await app.courses.createModule({ courseId: course.id, title: 'M1' });
    const lesson = await app.courses.createLesson({ moduleId: module.id, title: 'L1' });

    await app.courses.attachMedia({
      lessonId: lesson.id,
      mediaFileId: media.id,
      role: 'primary',
    });
    await expect(
      app.courses.attachMedia({
        lessonId: lesson.id,
        mediaFileId: media.id,
        role: 'primary',
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('loads a full course tree in one call', async () => {
    const course = await app.courses.create({ title: 'Curso' });
    const module = await app.courses.createModule({ courseId: course.id, title: 'M1' });
    const lesson = await app.courses.createLesson({ moduleId: module.id, title: 'L1' });

    const tree = await app.courses.getTree(course.id);
    expect(tree?.course.id).toBe(course.id);
    expect(tree?.modules).toHaveLength(1);
    expect(tree?.modules[0].lessons[0].id).toBe(lesson.id);
    expect(tree?.modules[0].lessons[0].media).toEqual([]);

    expect(await app.courses.getTree('missing')).toBeNull();
  });

  it('includes PDFs associated with the course and its modules in the course tree', async () => {
    const source = await app.library.createSource({ rootPath: '/Volumes/HD' });
    const modulePdf = await app.media.create({
      sourceId: source.id,
      relativePath: 'Curso/Modulo/02 - material.pdf',
      mediaType: 'pdf',
    });
    const coursePdf = await app.media.create({
      sourceId: source.id,
      relativePath: 'Curso/01 - geral.pdf',
      mediaType: 'pdf',
    });
    const course = await app.courses.create({ title: 'Curso' });
    const module = await app.courses.createModule({ courseId: course.id, title: 'Modulo' });
    const lesson = await app.courses.createLesson({ moduleId: module.id, title: 'Aula' });
    const video = await app.media.create({
      sourceId: source.id,
      relativePath: 'Curso/Modulo/Aula.mp4',
      mediaType: 'video',
      durationMs: 123_000,
    });
    await app.courses.attachMedia({ lessonId: lesson.id, mediaFileId: video.id, role: 'primary' });
    const moduleDocument = await app.documents.create({
      mediaFileId: modulePdf.id,
      title: '02 - material.pdf',
      pageCount: 4,
    });
    const courseDocument = await app.documents.create({
      mediaFileId: coursePdf.id,
      title: '01 - geral.pdf',
      pageCount: 2,
    });
    await app.documentAssociations.attachToModule(moduleDocument.id, module.id);
    await app.documentAssociations.attachToCourse(courseDocument.id, course.id);

    const tree = await app.courses.getTree(course.id);

    expect(tree?.documents.map((document) => document.id)).toEqual([courseDocument.id]);
    expect(tree?.modules[0].documents.map((document) => document.id)).toEqual([moduleDocument.id]);
    expect(tree?.totalDurationSeconds).toBe(123);
    expect(tree?.pdfCount).toBe(2);
  });

  it('deleting a course cascades modules/lessons but keeps media files', async () => {
    const source = await app.library.createSource({ rootPath: '/Volumes/HD' });
    const media = await app.media.create({
      sourceId: source.id,
      relativePath: 'v.mp4',
      mediaType: 'video',
    });
    const course = await app.courses.create({ title: 'Curso' });
    const module = await app.courses.createModule({ courseId: course.id, title: 'M1' });
    const lesson = await app.courses.createLesson({ moduleId: module.id, title: 'L1' });
    await app.courses.attachMedia({
      lessonId: lesson.id,
      mediaFileId: media.id,
      role: 'primary',
    });

    await app.courses.delete(course.id);

    expect(await app.courses.findById(course.id)).toBeNull();
    expect(await app.courses.listModules(course.id)).toHaveLength(0);
    expect(await app.courses.findLessonById(lesson.id)).toBeNull();
    // The physical media catalog entry survives course deletion.
    expect(await app.media.findById(media.id)).not.toBeNull();
  });
});
