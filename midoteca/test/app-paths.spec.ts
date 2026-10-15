import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveAppDataDir, resolveDefaultDatabasePath } from '../src/index';

describe('application data paths', () => {
  const original = process.env.MIDOTECA_DATA_DIR;

  afterEach(() => {
    if (original === undefined) delete process.env.MIDOTECA_DATA_DIR;
    else process.env.MIDOTECA_DATA_DIR = original;
  });

  it('honors the MIDOTECA_DATA_DIR override', () => {
    process.env.MIDOTECA_DATA_DIR = join('/tmp', 'custom-midoteca');
    expect(resolveAppDataDir()).toBe(join('/tmp', 'custom-midoteca'));
    expect(resolveDefaultDatabasePath()).toBe(
      join('/tmp', 'custom-midoteca', 'midoteca.db'),
    );
  });

  it('resolves a non-empty platform default when unset', () => {
    delete process.env.MIDOTECA_DATA_DIR;
    const dir = resolveAppDataDir();
    expect(dir.length).toBeGreaterThan(0);
    expect(resolveDefaultDatabasePath()).toBe(join(dir, 'midoteca.db'));
  });
});
