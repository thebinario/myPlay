import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createMidoteca, type Midoteca } from '../../../../src/index';
import { ValidationError } from '../../../../src/core/errors';
import { createTempDatabase, type TempDatabase } from '../../../helpers/temp-db';

const MINUTE = 60_000;

describe('watch progress use cases (SQLite)', () => {
  let temp: TempDatabase;
  let app: Midoteca;
  let lessonId: string;
  let videoId: string;

  beforeEach(async () => {
    temp = createTempDatabase();
    app = createMidoteca({ databaseFile: temp.file });
    const source = await app.library.createSource({ rootPath: '/Volumes/HD' });
    const video = await app.media.create({
      sourceId: source.id,
      relativePath: 'aula.mp4',
      mediaType: 'video',
    });
    videoId = video.id;
    const course = await app.courses.create({ title: 'Curso' });
    const module = await app.courses.createModule({ courseId: course.id, title: 'M1' });
    const lesson = await app.courses.createLesson({ moduleId: module.id, title: 'L1' });
    lessonId = lesson.id;
    app.database
      .prepare(`INSERT INTO lesson_media (lesson_id, media_file_id, role) VALUES (?, ?, 'primary')`)
      .run(lessonId, videoId);
  });

  afterEach(() => {
    if (app.database.isOpen) app.close();
    temp.cleanup();
  });

  async function playContinuously(fromMs: number, toMs: number, durationMs?: number) {
    let saved;
    for (let start = fromMs; start < toMs; start += 10_000) {
      saved = await app.watchProgress.recordSegment({
        lessonId,
        fromMs: start,
        toMs: Math.min(start + 10_000, toMs),
        durationMs,
      });
    }
    return saved!;
  }

  it('records real coverage and completes at 90% with a backend timestamp', async () => {
    const partial = await playContinuously(0, 5 * MINUTE, 10 * MINUTE);
    expect(partial.watchedMs).toBe(5 * MINUTE);
    expect(partial.watchedRatio).toBe(0.5);
    expect(partial.completedAt).toBeNull();
    expect(partial.positionMs).toBe(5 * MINUTE);

    const done = await playContinuously(5 * MINUTE, 9 * MINUTE, 10 * MINUTE);
    expect(done.completedAt).not.toBeNull();
    expect(done.completionSource).toBe('watched');
    expect(done.watchedRatio).toBeCloseTo(0.9);
  });

  it('seeking to the end does not mark the lesson as watched', async () => {
    await playContinuously(0, 20_000, 10 * MINUTE);
    const atEnd = await app.watchProgress.recordSegment({
      lessonId,
      fromMs: 10 * MINUTE - 3_000,
      toMs: 10 * MINUTE,
      durationMs: 10 * MINUTE,
    });
    expect(atEnd.completedAt).toBeNull();
    expect(atEnd.watchedMs).toBe(23_000);
  });

  it('prefers the catalogued media duration over the one reported by the player', async () => {
    app.database
      .prepare('UPDATE media_files SET duration_ms = ? WHERE id = ?')
      .run(MINUTE, videoId);
    const saved = await playContinuously(0, 54_000, 10 * MINUTE);
    expect(saved.durationMs).toBe(MINUTE);
    expect(saved.completedAt).not.toBeNull();
  });

  it('rejects segments longer than the reporting window', async () => {
    await expect(
      app.watchProgress.recordSegment({
        lessonId,
        fromMs: 0,
        toMs: 10 * MINUTE,
        durationMs: 10 * MINUTE,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('keeps a manual completion even when coverage is low, and records its source', async () => {
    await playContinuously(0, 10_000, 10 * MINUTE);
    const manual = await app.watchProgress.setCompletion({ lessonId, completed: true });
    expect(manual.completedAt).not.toBeNull();
    expect(manual.completionSource).toBe('manual');
    expect(manual.watchedMs).toBe(10_000);

    const afterMore = await app.watchProgress.recordSegment({
      lessonId,
      fromMs: 10_000,
      toMs: 20_000,
      durationMs: 10 * MINUTE,
    });
    expect(afterMore.completionSource).toBe('manual');
    expect(afterMore.completedAt).toBe(manual.completedAt);
  });

  it('unmarking clears completion but preserves coverage', async () => {
    await playContinuously(0, 9 * MINUTE, 10 * MINUTE);
    const cleared = await app.watchProgress.setCompletion({ lessonId, completed: false });
    expect(cleared.completedAt).toBeNull();
    expect(cleared.completionSource).toBeNull();
    expect(cleared.watchedMs).toBe(9 * MINUTE);
  });

  it('saving the position never changes completion or coverage', async () => {
    await playContinuously(0, 9 * MINUTE, 10 * MINUTE);
    const saved = await app.watchProgress.savePosition({
      lessonId,
      positionMs: 1_000,
      durationMs: 10 * MINUTE,
    });
    expect(saved.positionMs).toBe(1_000);
    expect(saved.completedAt).not.toBeNull();
    expect(saved.watchedMs).toBe(9 * MINUTE);
  });

  it('persists coverage across reopening the database', async () => {
    await playContinuously(0, 30_000, 10 * MINUTE);
    app.close();
    app = createMidoteca({ databaseFile: temp.file });
    const read = await app.progress.getPlayback(lessonId);
    expect(read?.watchedIntervals).toEqual([{ fromMs: 0, toMs: 30_000 }]);
    expect(read?.watchedMs).toBe(30_000);
  });
});
