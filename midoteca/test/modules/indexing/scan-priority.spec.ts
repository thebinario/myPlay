import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createMidoteca, type Midoteca } from '../../../src/index';
import { createTempDatabase, type TempDatabase } from '../../helpers/temp-db';
import { createTempLibrary, type TempLibrary } from '../../helpers/temp-library';

/** Directory analysis has priority over every background job. */
describe('scan priority over background jobs', () => {
  let temp: TempDatabase;
  let library: TempLibrary;
  let app: Midoteca;

  beforeEach(() => {
    temp = createTempDatabase();
    library = createTempLibrary();
    app = createMidoteca({ databaseFile: temp.file });
  });

  afterEach(() => {
    app.close();
    library.cleanup();
    temp.cleanup();
  });

  it('holds background jobs from the start to the end of a scan', async () => {
    library.write('Curso/01 - Aula.mp4', 'v');
    const source = await app.sources.addSource({ rootPath: library.root });

    const scanning = app.indexer.runScan({ sourceId: source.id });
    expect(app.governor.isPriorityWorkActive).toBe(true);

    await scanning;
    expect(app.governor.isPriorityWorkActive).toBe(false);
  });

  it('releases the jobs even when the scan fails', async () => {
    await expect(app.indexer.runScan({ sourceId: 'nao-existe' })).rejects.toThrow();
    expect(app.governor.isPriorityWorkActive).toBe(false);
  });
});
