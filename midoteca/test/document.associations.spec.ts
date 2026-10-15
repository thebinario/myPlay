import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createMidoteca, NotFoundError, type Midoteca } from '../src/index';
import { createTempDatabase, type TempDatabase } from './helpers/temp-db';

describe('DocumentAssociationService', () => {
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
    moduleId = (await app.courses.createModule({ courseId, title: 'M1' })).id;
    lessonId = (await app.courses.createLesson({ moduleId, title: 'L1' })).id;
  });

  afterEach(() => {
    app.close();
    temp.cleanup();
  });

  async function makeDocument(title = 'Apostila'): Promise<string> {
    return (await app.documents.create({ mediaFileId, title })).id;
  }

  it('attaches a document to course/module/lesson and lists each scope', async () => {
    const doc = await makeDocument();
    await app.documentAssociations.attachToCourse(doc, courseId);
    await app.documentAssociations.attachToModule(doc, moduleId);
    await app.documentAssociations.attachToLesson(doc, lessonId);

    expect((await app.documentAssociations.listCourseDocuments(courseId)).map((d) => d.id)).toEqual(
      [doc],
    );
    expect((await app.documentAssociations.listModuleDocuments(moduleId)).map((d) => d.id)).toEqual(
      [doc],
    );
    expect((await app.documentAssociations.listLessonDocuments(lessonId)).map((d) => d.id)).toEqual(
      [doc],
    );
  });

  it('is idempotent: re-attaching the same target returns the existing link', async () => {
    const doc = await makeDocument();
    const first = await app.documentAssociations.attachToLesson(doc, lessonId);
    const second = await app.documentAssociations.attachToLesson(doc, lessonId);
    expect(second.id).toBe(first.id);
    expect(await app.documents.listLinks(doc)).toHaveLength(1);
  });

  it('detaches a link without deleting the document or the file', async () => {
    const doc = await makeDocument();
    const link = await app.documentAssociations.attachToCourse(doc, courseId);

    await app.documentAssociations.detach(link.id);

    expect(await app.documents.listLinks(doc)).toHaveLength(0);
    expect(await app.documents.findById(doc)).not.toBeNull();
    expect(await app.media.findById(mediaFileId)).not.toBeNull();
  });

  it('detaches every link while keeping the document row', async () => {
    const doc = await makeDocument();
    await app.documentAssociations.attachToCourse(doc, courseId);
    await app.documentAssociations.attachToLesson(doc, lessonId);

    await app.documentAssociations.detachAll(doc);

    expect(await app.documents.listLinks(doc)).toHaveLength(0);
    expect(await app.documents.findById(doc)).not.toBeNull();
  });

  it('returns document details with its links, or throws when missing', async () => {
    const doc = await makeDocument();
    await app.documentAssociations.attachToModule(doc, moduleId);

    const details = await app.documentAssociations.getDocumentDetails(doc);
    expect(details.document.id).toBe(doc);
    expect(details.links).toHaveLength(1);

    await expect(app.documentAssociations.getDocumentDetails('missing')).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('renames a document and marks it as a manual edit', async () => {
    const doc = await makeDocument('Original');
    const updated = await app.documents.update({ id: doc, title: 'Novo Título' });
    expect(updated.title).toBe('Novo Título');
    expect(updated.titleSource).toBe('manual');
  });
});
