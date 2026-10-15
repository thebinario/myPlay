import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createMidoteca, type Midoteca } from '../src/index';
import { createTempDatabase, type TempDatabase } from './helpers/temp-db';

describe('media repository', () => {
  let temp: TempDatabase;
  let app: Midoteca;
  let sourceId: string;

  beforeEach(async () => {
    temp = createTempDatabase();
    app = createMidoteca({ databaseFile: temp.file });
    const source = await app.library.createSource({
      rootPath: '/Volumes/HD-Externo',
      volumeId: 'VOL-123',
    });
    sourceId = source.id;
  });

  afterEach(() => {
    app.close();
    temp.cleanup();
  });

  it('creates and finds a media file by relative path', async () => {
    const created = await app.media.create({
      sourceId,
      relativePath: 'curso/aula-01.mp4',
      mediaType: 'video',
      fileSize: 1024,
      durationMs: 60000,
    });

    const byId = await app.media.findById(created.id);
    expect(byId?.relativePath).toBe('curso/aula-01.mp4');
    expect(byId?.availability).toBe('unverified');

    const byPath = await app.media.findBySourceAndRelativePath(
      sourceId,
      'curso/aula-01.mp4',
    );
    expect(byPath?.id).toBe(created.id);
    expect(await app.media.listBySource(sourceId)).toHaveLength(1);
  });

  it('allows duplicate sha256 across files (no global uniqueness)', async () => {
    const sha256 = 'a'.repeat(64);
    await app.media.create({
      sourceId,
      relativePath: 'copy-a.mp4',
      mediaType: 'video',
      sha256,
    });
    await app.media.create({
      sourceId,
      relativePath: 'copy-b.mp4',
      mediaType: 'video',
      sha256,
    });
    const matches = await app.media.findBySha256(sha256);
    expect(matches).toHaveLength(2);
  });

  it('rejects invalid sha256 digests', async () => {
    await expect(
      app.media.create({
        sourceId,
        relativePath: 'bad.mp4',
        mediaType: 'video',
        sha256: 'not-a-hash',
      }),
    ).rejects.toThrow();
  });

  it('updates mutable fields and availability', async () => {
    const media = await app.media.create({
      sourceId,
      relativePath: 'v.mp4',
      mediaType: 'video',
    });
    const updated = await app.media.update({
      id: media.id,
      fileSize: 2048,
      durationMs: 30000,
      sha256: 'b'.repeat(64),
    });
    expect(updated.fileSize).toBe(2048);
    expect(updated.sha256).toBe('b'.repeat(64));

    await app.media.setAvailability(media.id, 'missing');
    expect((await app.media.findById(media.id))?.availability).toBe('missing');
  });

  it('rejects unknown media on update', async () => {
    await expect(app.media.update({ id: 'missing' })).rejects.toThrow();
  });

  it('manages media tracks', async () => {
    const media = await app.media.create({
      sourceId,
      relativePath: 'v.mp4',
      mediaType: 'video',
    });
    const track = await app.media.addTrack({
      mediaFileId: media.id,
      kind: 'subtitle',
      language: 'pt-BR',
      path: 'v.pt.srt',
      metadata: { format: 'srt' },
    });
    const tracks = await app.media.listTracks(media.id);
    expect(tracks).toHaveLength(1);
    expect(tracks[0]).toMatchObject({ kind: 'subtitle', language: 'pt-BR' });
    expect(tracks[0].metadata).toEqual({ format: 'srt' });

    await app.media.deleteTrack(track.id);
    expect(await app.media.listTracks(media.id)).toHaveLength(0);
  });
});
