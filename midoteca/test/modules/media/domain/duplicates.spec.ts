import { describe, expect, it } from 'vitest';
import {
  FRAME_HEIGHT,
  FRAME_WIDTH,
  dHash,
  frameSimilarity,
  hammingDistance,
  isPerceptualMatch,
} from '../../../../src/modules/media/domain/perceptual-fingerprint';
import { groupDuplicates } from '../../../../src/modules/media/domain/duplicate-detection';

/** 9x8 grayscale frame filled by a function of (x, y). */
function frame(fn: (x: number, y: number) => number): Uint8Array {
  const pixels = new Uint8Array(FRAME_WIDTH * FRAME_HEIGHT);
  for (let y = 0; y < FRAME_HEIGHT; y++) {
    for (let x = 0; x < FRAME_WIDTH; x++) pixels[y * FRAME_WIDTH + x] = fn(x, y) & 0xff;
  }
  return pixels;
}

describe('perceptual fingerprint (dHash)', () => {
  it('produces a 64-bit hash as 16 hex chars', () => {
    expect(dHash(frame((x) => x * 20))).toMatch(/^[0-9a-f]{16}$/);
  });

  it('is stable under brightness/contrast changes (re-encoding noise)', () => {
    const original = frame((x, y) => (x * 25 + y * 7) % 256);
    const brighter = frame((x, y) =>
      Math.min(255, Math.round(((x * 25 + y * 7) % 256) * 0.8 + 30)),
    );
    expect(hammingDistance(dHash(original), dHash(brighter))).toBeLessThanOrEqual(4);
  });

  it('differs strongly for unrelated images', () => {
    const rising = frame((x) => x * 28);
    const falling = frame((x) => 255 - x * 28);
    expect(hammingDistance(dHash(rising), dHash(falling))).toBeGreaterThan(40);
  });

  it('rejects frames with the wrong size', () => {
    expect(() => dHash(new Uint8Array(10))).toThrow();
  });
});

describe('perceptual match', () => {
  const a = ['00ff00ff00ff00ff', 'ffff0000ffff0000', '0f0f0f0f0f0f0f0f', 'aaaaaaaaaaaaaaaa'];

  it('matches when at least 90% of the frames are within the hamming threshold', () => {
    const b = ['00ff00ff00ff00fe', 'ffff0000ffff0001', '0f0f0f0f0f0f0f0f', 'aaaaaaaaaaaaaaab'];
    expect(frameSimilarity(a, b)).toBe(1);
    expect(isPerceptualMatch(a, b)).toBe(true);
  });

  it('does not match different content', () => {
    const b = ['ff00ff00ff00ff00', '0000ffff0000ffff', 'f0f0f0f0f0f0f0f0', '5555555555555555'];
    expect(isPerceptualMatch(a, b)).toBe(false);
  });

  it('does not match fingerprints with different frame counts', () => {
    expect(isPerceptualMatch(a, a.slice(0, 3))).toBe(false);
  });
});

describe('groupDuplicates', () => {
  it('groups exact copies by sha256 and re-encodes by perceptual links (transitively)', () => {
    const groups = groupDuplicates(
      [
        { id: 'a', sha256: 'h1' },
        { id: 'b', sha256: 'h1' },
        { id: 'c', sha256: 'h2' },
        { id: 'd', sha256: null },
        { id: 'e', sha256: 'h3' },
      ],
      [{ a: 'c', b: 'd', similarity: 0.95 }],
    );
    expect(groups).toEqual([
      { kind: 'exact', mediaFileIds: ['a', 'b'] },
      { kind: 'perceptual', mediaFileIds: ['c', 'd'] },
    ]);
  });

  it('marks a group perceptual when exact and perceptual matches are mixed', () => {
    const groups = groupDuplicates(
      [
        { id: 'a', sha256: 'h1' },
        { id: 'b', sha256: 'h1' },
        { id: 'c', sha256: 'h2' },
      ],
      [{ a: 'b', b: 'c', similarity: 0.92 }],
    );
    expect(groups).toEqual([{ kind: 'perceptual', mediaFileIds: ['a', 'b', 'c'] }]);
  });
});
