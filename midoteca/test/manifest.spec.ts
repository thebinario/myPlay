import { describe, expect, it } from 'vitest';
import { ManifestParseError, parseManifest } from '../src/modules/indexing/domain/manifest';

describe('course manifest contract', () => {
  it('parses a valid manifest', () => {
    const manifest = parseManifest({
      version: 1,
      course: { title: 'Curso' },
      modules: { 'Curso/Mod 1': { title: 'Modulo Um' } },
      lessons: { 'Curso/Mod 1/a.mp4': { title: 'Aula' } },
    });
    expect(manifest).toEqual({
      version: 1,
      course: { title: 'Curso' },
      modules: { 'Curso/Mod 1': { title: 'Modulo Um' } },
      lessons: { 'Curso/Mod 1/a.mp4': { title: 'Aula' } },
    });
  });

  it('accepts an empty manifest body', () => {
    expect(parseManifest({ version: 1 })).toEqual({ version: 1 });
  });

  it('returns null when the payload is not a manifest', () => {
    expect(parseManifest(null)).toBeNull();
    expect(parseManifest([])).toBeNull();
    expect(parseManifest({ foo: 'bar' })).toBeNull();
  });

  it('rejects an unsupported version', () => {
    expect(() => parseManifest({ version: 2 })).toThrow(ManifestParseError);
  });

  it('rejects malformed known fields', () => {
    expect(() => parseManifest({ version: 1, course: { title: '  ' } })).toThrow(
      ManifestParseError,
    );
    expect(() => parseManifest({ version: 1, modules: 5 })).toThrow(ManifestParseError);
  });
});
