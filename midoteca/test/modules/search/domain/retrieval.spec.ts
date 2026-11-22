import { describe, expect, it } from 'vitest';
import {
  cosineSimilarity,
  reciprocalRankFusion,
  toFtsAnyQuery,
} from '../../../../src/modules/search/domain/retrieval';

describe('reciprocalRankFusion', () => {
  it('rewards items ranked well by both lists', () => {
    const fused = reciprocalRankFusion([
      [1, 2, 3, 4],
      [3, 1, 5],
    ]);
    expect(fused.slice(0, 2)).toEqual([1, 3]);
    expect(fused).toHaveLength(5);
  });

  it('works with a single list and empty lists', () => {
    expect(reciprocalRankFusion([[7, 8], []])).toEqual([7, 8]);
    expect(reciprocalRankFusion([])).toEqual([]);
  });
});

describe('toFtsAnyQuery', () => {
  it('matches any meaningful term of a natural-language question', () => {
    expect(toFtsAnyQuery('Como eu configuro o Docker no Windows?')).toBe(
      '"configuro"* OR "docker"* OR "windows"*',
    );
  });

  it('returns null when only stopwords remain', () => {
    expect(toFtsAnyQuery('o que é isso?')).toBeNull();
  });
});

describe('cosineSimilarity', () => {
  it('is 1 for identical directions and 0 for orthogonal ones', () => {
    expect(cosineSimilarity(Float32Array.from([1, 0]), Float32Array.from([2, 0]))).toBeCloseTo(1);
    expect(cosineSimilarity(Float32Array.from([1, 0]), Float32Array.from([0, 3]))).toBeCloseTo(0);
  });
});
