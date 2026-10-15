import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createMidoteca, type Midoteca } from '../src/index';
import { createTempDatabase, type TempDatabase } from './helpers/temp-db';

describe('progress repository', () => {
  let temp: TempDatabase;
  let app: Midoteca;
  let lessonId: string;
  let documentId: string;

  beforeEach(async () => {
    temp = createTempDatabase();
    app = createMidoteca({ databaseFile: temp.file });

    const source = await app.library.createSource({ rootPath: '/Volumes/HD' });
    const video = await app.media.create({
      sourceId: source.id,
      relativePath: 'aula.mp4',
      mediaType: 'video',
    });
    const pdf = await app.media.create({
      sourceId: source.id,
      relativePath: 'doc.pdf',
      mediaType: 'pdf',
    });
    const course = await app.courses.create({ title: 'Curso' });
    const module = await app.courses.createModule({ courseId: course.id, title: 'M1' });
    const lesson = await app.courses.createLesson({ moduleId: module.id, title: 'L1' });
    lessonId = lesson.id;
    const document = await app.documents.create({
      mediaFileId: pdf.id,
      title: 'Documento',
      pageCount: 100,
    });
    documentId = document.id;
    void video;
  });

  afterEach(() => {
    if (app.database.isOpen) app.close();
    temp.cleanup();
  });

  it('saves and reads playback progress', async () => {
    const saved = await app.progress.savePlayback({
      lessonId,
      positionMs: 12345,
      durationMs: 60000,
    });
    expect(saved.positionMs).toBe(12345);

    const read = await app.progress.getPlayback(lessonId);
    expect(read?.positionMs).toBe(12345);
    expect(read?.completedAt).toBeNull();
  });

  it('upserts playback progress for the same lesson (single row)', async () => {
    await app.progress.savePlayback({ lessonId, positionMs: 1000 });
    await app.progress.savePlayback({ lessonId, positionMs: 5000, durationMs: 9000 });
    await app.progress.savePlayback({
      lessonId,
      positionMs: 9000,
      durationMs: 9000,
      completedAt: '2026-10-15T12:00:00.000Z',
    });

    const read = await app.progress.getPlayback(lessonId);
    expect(read?.positionMs).toBe(9000);
    expect(read?.completedAt).toBe('2026-10-15T12:00:00.000Z');

    const count = app.database
      .prepare('SELECT COUNT(*) AS c FROM playback_progress WHERE lesson_id = ?')
      .get(lessonId) as { c: number };
    expect(count.c).toBe(1);
  });

  it('returns null for unknown lesson progress', async () => {
    expect(await app.progress.getPlayback('missing')).toBeNull();
  });

  it('persists playback progress after reopening the database', async () => {
    await app.progress.savePlayback({ lessonId, positionMs: 4242 });
    app.close();

    const reopened = createMidoteca({ databaseFile: temp.file });
    try {
      const read = await reopened.progress.getPlayback(lessonId);
      expect(read?.positionMs).toBe(4242);
    } finally {
      reopened.close();
    }
  });

  it('validates playback input', async () => {
    await expect(
      app.progress.savePlayback({ lessonId, positionMs: -1 }),
    ).rejects.toThrow();
  });

  it('saves and reads reading progress', async () => {
    const saved = await app.progress.saveReading({
      documentId,
      page: 12,
      scrollRatio: 0.42,
      zoom: 1.25,
      theme: 'dark',
    });
    expect(saved.page).toBe(12);

    const read = await app.progress.getReading(documentId);
    expect(read).toMatchObject({
      page: 12,
      scrollRatio: 0.42,
      zoom: 1.25,
      theme: 'dark',
    });
  });

  it('validates reading progress bounds', async () => {
    await expect(
      app.progress.saveReading({
        documentId,
        page: 0,
        scrollRatio: 0,
        zoom: 1,
      }),
    ).rejects.toThrow();
    await expect(
      app.progress.saveReading({
        documentId,
        page: 1,
        scrollRatio: 1.5,
        zoom: 1,
      }),
    ).rejects.toThrow();
    await expect(
      app.progress.saveReading({
        documentId,
        page: 1,
        scrollRatio: 0,
        zoom: 0,
      }),
    ).rejects.toThrow();
  });
});
