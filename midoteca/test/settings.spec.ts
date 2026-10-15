import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createMidoteca, type Midoteca } from '../src/index';
import { createTempDatabase, type TempDatabase } from './helpers/temp-db';

describe('settings repository', () => {
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

  it('returns null for a missing key', async () => {
    expect(await app.settings.get('nope')).toBeNull();
  });

  it('stores primitives and objects with upsert semantics', async () => {
    await app.settings.set('theme', 'dark');
    expect((await app.settings.get('theme'))?.value).toBe('dark');

    await app.settings.set('player', { volume: 0.8, autoplay: true });
    expect((await app.settings.get('player'))?.value).toEqual({
      volume: 0.8,
      autoplay: true,
    });

    await app.settings.set('theme', 'light');
    expect((await app.settings.get('theme'))?.value).toBe('light');
    expect(await app.settings.list()).toHaveLength(2);
  });

  it('deletes a key', async () => {
    await app.settings.set('a', 1);
    await app.settings.delete('a');
    expect(await app.settings.get('a')).toBeNull();
  });
});
