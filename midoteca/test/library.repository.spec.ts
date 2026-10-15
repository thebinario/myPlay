import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createMidoteca, ConflictError, type Midoteca } from '../src/index';
import { createTempDatabase, type TempDatabase } from './helpers/temp-db';

describe('library source repository', () => {
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

  it('creates and lists sources', async () => {
    await app.library.createSource({ rootPath: '/Volumes/A', volumeId: 'VA' });
    await app.library.createSource({ rootPath: '/Volumes/B' });

    const sources = await app.library.listSources();
    expect(sources).toHaveLength(2);
    expect(sources[0].status).toBe('active');
    expect(sources[0].lastScanAt).toBeNull();
  });

  it('finds a source by volume id', async () => {
    const created = await app.library.createSource({
      rootPath: '/Volumes/A',
      volumeId: 'VOL-1',
    });
    expect((await app.library.findSourceByVolumeId('VOL-1'))?.id).toBe(created.id);
    expect(await app.library.findSourceByVolumeId('nope')).toBeNull();
  });

  it('enforces unique volume ids (when present)', async () => {
    await app.library.createSource({ rootPath: '/Volumes/A', volumeId: 'DUP' });
    await expect(
      app.library.createSource({ rootPath: '/Volumes/B', volumeId: 'DUP' }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('updates status and scan timestamp', async () => {
    const source = await app.library.createSource({ rootPath: '/Volumes/A' });
    const updated = await app.library.updateSourceStatus(source.id, {
      status: 'scanning',
    });
    expect(updated?.status).toBe('scanning');

    const scanned = await app.library.updateSourceStatus(source.id, {
      status: 'active',
      lastScanAt: '2026-10-15T10:00:00.000Z',
    });
    expect(scanned?.lastScanAt).toBe('2026-10-15T10:00:00.000Z');

    expect(await app.library.updateSourceStatus('missing', { status: 'active' })).toBeNull();
  });

  it('deletes a source idempotently', async () => {
    const source = await app.library.createSource({ rootPath: '/Volumes/A' });
    await app.library.deleteSource(source.id);
    await expect(app.library.deleteSource(source.id)).resolves.toBeUndefined();
    expect(await app.library.findSourceById(source.id)).toBeNull();
  });
});
