import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createMidoteca, ValidationError, type Midoteca } from '../src/index';
import { createTempDatabase, type TempDatabase } from './helpers/temp-db';

describe('document repository', () => {
  let temp: TempDatabase;
  let app: Midoteca;
  let mediaFileId: string;
  let courseId: string;
  let moduleId: string;
  let lessonId: string;

  beforeEach(async () => {
    temp = createTempDatabase();
    app = createMidoteca({ databaseFile: temp.file });

    const source = await app.library.createSource({ rootPath: '/Volumes/HD' });
    const pdf = await app.media.create({
      sourceId: source.id,
      relativePath: 'material.pdf',
      mediaType: 'pdf',
    });
    mediaFileId = pdf.id;

    const course = await app.courses.create({ title: 'Curso' });
    courseId = course.id;
    const module = await app.courses.createModule({ courseId, title: 'M1' });
    moduleId = module.id;
    const lesson = await app.courses.createLesson({ moduleId, title: 'L1' });
    lessonId = lesson.id;
  });

  afterEach(() => {
    app.close();
    temp.cleanup();
  });

  it('creates and finds a document by media file', async () => {
    const doc = await app.documents.create({
      mediaFileId,
      title: 'Apostila',
      pageCount: 42,
    });
    expect(await app.documents.findById(doc.id)).toMatchObject({
      title: 'Apostila',
      pageCount: 42,
    });
    expect((await app.documents.findByMediaFileId(mediaFileId))?.id).toBe(doc.id);
    expect(await app.documents.list()).toHaveLength(1);
  });

  it('links a document to a course only', async () => {
    const doc = await app.documents.create({ mediaFileId, title: 'Doc' });
    const link = await app.documents.createLink({
      documentId: doc.id,
      courseId,
    });
    expect(link.courseId).toBe(courseId);
    expect(await app.documents.listLinks(doc.id)).toHaveLength(1);
  });

  it('links a document to a lesson only', async () => {
    const doc = await app.documents.create({ mediaFileId, title: 'Doc' });
    const link = await app.documents.createLink({
      documentId: doc.id,
      lessonId,
    });
    expect(link.lessonId).toBe(lessonId);
  });

  it('rejects a link with no target', async () => {
    const doc = await app.documents.create({ mediaFileId, title: 'Doc' });
    await expect(app.documents.createLink({ documentId: doc.id })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it('deletes a document and cascades its links (media kept)', async () => {
    const doc = await app.documents.create({ mediaFileId, title: 'Doc' });
    await app.documents.createLink({ documentId: doc.id, courseId });

    await app.documents.delete(doc.id);

    expect(await app.documents.findById(doc.id)).toBeNull();
    expect(await app.documents.listLinks(doc.id)).toHaveLength(0);
    expect(await app.media.findById(mediaFileId)).not.toBeNull();
  });
});
