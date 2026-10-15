import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createMidoteca, ConflictError, type Midoteca } from '../src/index';
import { createTempDatabase, type TempDatabase } from './helpers/temp-db';

describe('referential integrity and constraints', () => {
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

  it('rejects a media file pointing at a non-existent source (FK)', async () => {
    await expect(
      app.media.create({
        sourceId: '00000000-0000-0000-0000-000000000000',
        relativePath: 'ghost.mp4',
        mediaType: 'video',
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('enforces unique (source, relativePath)', async () => {
    const source = await app.library.createSource({ rootPath: '/Volumes/HD' });
    await app.media.create({
      sourceId: source.id,
      relativePath: 'a.mp4',
      mediaType: 'video',
    });
    await expect(
      app.media.create({
        sourceId: source.id,
        relativePath: 'a.mp4',
        mediaType: 'video',
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('enforces numeric CHECK constraints at the database level', async () => {
    const source = await app.library.createSource({ rootPath: '/Volumes/HD' });

    // Domain validation rejects negatives first; a raw insert proves the CHECK
    // constraint also guards the schema directly.
    await expect(
      app.media.create({
        sourceId: source.id,
        relativePath: 'neg.mp4',
        mediaType: 'video',
        fileSize: -1,
      }),
    ).rejects.toThrow();

    const now = new Date().toISOString();
    expect(() =>
      app.database
        .prepare(
          `INSERT INTO media_files (id, source_id, relative_path, media_type, file_size, availability, created_at, updated_at)
           VALUES ('neg1', ?, 'neg.mp4', 'video', -1, 'available', ?, ?)`,
        )
        .run(source.id, now, now),
    ).toThrow();
  });

  it('requires a document link target (DB CHECK)', async () => {
    const source = await app.library.createSource({ rootPath: '/Volumes/HD' });

    // Insert directly to bypass domain validation and prove the CHECK
    // constraint is present in the schema itself.
    const now = new Date().toISOString();
    app.database
      .prepare(
        `INSERT INTO media_files (id, source_id, relative_path, media_type, availability, created_at, updated_at)
         VALUES ('m1', ?, 'd.pdf', 'pdf', 'available', ?, ?)`,
      )
      .run(source.id, now, now);
    app.database
      .prepare(
        `INSERT INTO documents (id, media_file_id, title) VALUES ('d1', 'm1', 't')`,
      )
      .run();

    expect(() =>
      app.database
        .prepare(
          `INSERT INTO document_links (id, document_id, course_id, module_id, lesson_id)
           VALUES ('l1', 'd1', NULL, NULL, NULL)`,
        )
        .run(),
    ).toThrow();
  });

  it('cascades media rows when a source is deleted (catalog only)', async () => {
    const source = await app.library.createSource({ rootPath: '/Volumes/HD' });
    const media = await app.media.create({
      sourceId: source.id,
      relativePath: 'a.mp4',
      mediaType: 'video',
    });
    await app.library.deleteSource(source.id);
    expect(await app.media.findById(media.id)).toBeNull();
  });

  it('NEVER deletes the physical file when catalog rows are removed', async () => {
    const realFile = join(temp.dir, 'precious-video.mp4');
    writeFileSync(realFile, 'binary-content');

    const source = await app.library.createSource({ rootPath: temp.dir });
    const media = await app.media.create({
      sourceId: source.id,
      relativePath: 'precious-video.mp4',
      mediaType: 'video',
    });

    await app.media.delete(media.id);
    expect(existsSync(realFile)).toBe(true);

    await app.library.deleteSource(source.id);
    expect(existsSync(realFile)).toBe(true);
  });

  it('rolls back an explicit transaction that fails midway', async () => {
    const source = await app.library.createSource({ rootPath: '/Volumes/HD' });
    const before = (app.database
      .prepare('SELECT COUNT(*) AS c FROM media_files')
      .get() as { c: number }).c;

    expect(() =>
      app.database.transaction(() => {
        app.database
          .prepare(
            `INSERT INTO media_files (id, source_id, relative_path, media_type, availability, created_at, updated_at)
             VALUES ('tx1', ?, 'x.mp4', 'video', 'available', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')`,
          )
          .run(source.id);
        // Duplicate PK forces a constraint error inside the transaction.
        app.database
          .prepare(
            `INSERT INTO media_files (id, source_id, relative_path, media_type, availability, created_at, updated_at)
             VALUES ('tx1', ?, 'y.mp4', 'video', 'available', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')`,
          )
          .run(source.id);
      }),
    ).toThrow();

    const after = (app.database
      .prepare('SELECT COUNT(*) AS c FROM media_files')
      .get() as { c: number }).c;
    expect(after).toBe(before);
    expect(
      app.database.prepare("SELECT id FROM media_files WHERE id = 'tx1'").get(),
    ).toBeUndefined();
  });
});
