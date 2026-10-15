import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  ConflictError,
  createMidoteca,
  NotFoundError,
  ValidationError,
  type Midoteca,
} from '../src/index';
import { createTempDatabase, type TempDatabase } from './helpers/temp-db';
import { createTempLibrary, type TempLibrary } from './helpers/temp-library';
import { rmSync } from 'node:fs';

describe('LibrarySourceService', () => {
  let temp: TempDatabase;
  let app: Midoteca;
  let library: TempLibrary;

  beforeEach(() => {
    temp = createTempDatabase();
    app = createMidoteca({ databaseFile: temp.file });
    library = createTempLibrary();
  });

  afterEach(() => {
    app.close();
    temp.cleanup();
    library.cleanup();
  });

  it('adds a valid source and emits source:added', async () => {
    const events: string[] = [];
    app.events.on('source:added', (p) => events.push(p.sourceId));

    const source = await app.sources.addSource({ rootPath: library.root });
    expect(source.rootPath).toBe(library.root.replace(/\/$/, ''));
    expect(source.status).toBe('active');
    expect(source.displayName).toBeTruthy();
    expect(events).toEqual([source.id]);
    expect(await app.sources.listSources()).toHaveLength(1);
  });

  it('rejects nonexistent, non-directory and duplicate paths', async () => {
    await expect(
      app.sources.addSource({ rootPath: `${library.root}/missing` }),
    ).rejects.toBeInstanceOf(NotFoundError);

    const file = library.write('file.mp4', 'x');
    await expect(app.sources.addSource({ rootPath: file })).rejects.toBeInstanceOf(ValidationError);

    await app.sources.addSource({ rootPath: library.root });
    await expect(app.sources.addSource({ rootPath: library.root })).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it('reports availability and flips status when the path disappears', async () => {
    const source = await app.sources.addSource({ rootPath: library.root });
    const available = await app.sources.checkAvailability(source.id);
    expect(available.exists).toBe(true);
    expect(available.status).toBe('active');

    rmSync(library.root, { recursive: true, force: true });
    const offline = await app.sources.checkAvailability(source.id);
    expect(offline.exists).toBe(false);
    expect(offline.status).toBe('offline');
    expect((await app.sources.getSource(source.id)).status).toBe('offline');
  });

  it('removes only the catalog row, never files', async () => {
    const source = await app.sources.addSource({ rootPath: library.root });
    library.write('keep.mp4', 'x');
    await app.sources.removeSource(source.id);
    expect(await app.sources.listSources()).toHaveLength(0);
    expect(await app.sources.getSource(source.id).catch(() => 'gone')).toBe('gone');
  });
});
