/**
 * Perceptual fingerprint of a video: one 64-bit difference hash (dHash) per
 * frame sampled at proportional positions. Re-encodes (other resolution,
 * bitrate or container) keep the hashes within a small Hamming distance, while
 * different content diverges. Pure: pixels come from an adapter (ffmpeg).
 */

/** dHash compares each pixel with its right neighbour on a 9x8 grayscale frame. */
export const FRAME_WIDTH = 9;
export const FRAME_HEIGHT = 8;
/** Frames sampled per video. */
export const FINGERPRINT_FRAMES = 16;
/** Max differing bits for two frames to be "the same picture". */
export const FRAME_HAMMING_THRESHOLD = 10;
/** Fraction of frames that must match for two videos to be duplicates. */
export const PERCEPTUAL_MATCH_RATIO = 0.9;
/** Durations closer than this make two videos fingerprint candidates. */
export const DURATION_TOLERANCE_MS = 2_000;

export function dHash(pixels: Uint8Array): string {
  if (pixels.length !== FRAME_WIDTH * FRAME_HEIGHT) {
    throw new Error(`dHash expects a ${FRAME_WIDTH}x${FRAME_HEIGHT} grayscale frame`);
  }
  let hex = '';
  for (let y = 0; y < FRAME_HEIGHT; y++) {
    let byte = 0;
    for (let x = 0; x < FRAME_WIDTH - 1; x++) {
      const left = pixels[y * FRAME_WIDTH + x];
      const right = pixels[y * FRAME_WIDTH + x + 1];
      byte = (byte << 1) | (left > right ? 1 : 0);
    }
    hex += byte.toString(16).padStart(2, '0');
  }
  return hex;
}

export function hammingDistance(a: string, b: string): number {
  let distance = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i += 2) {
    let diff = parseInt(a.slice(i, i + 2), 16) ^ parseInt(b.slice(i, i + 2), 16);
    while (diff) {
      distance += diff & 1;
      diff >>= 1;
    }
  }
  return distance + Math.abs(a.length - b.length) * 4;
}

/** Fraction of aligned frames within the Hamming threshold (0..1). */
export function frameSimilarity(a: readonly string[], b: readonly string[]): number {
  if (a.length === 0 || a.length !== b.length) return 0;
  const matching = a.filter(
    (hash, index) => hammingDistance(hash, b[index]) <= FRAME_HAMMING_THRESHOLD,
  ).length;
  return matching / a.length;
}

export function isPerceptualMatch(a: readonly string[], b: readonly string[]): boolean {
  return frameSimilarity(a, b) >= PERCEPTUAL_MATCH_RATIO;
}

/** Timestamps (ms) of the sampled frames, avoiding the very start and end. */
export function sampleTimestamps(durationMs: number, count = FINGERPRINT_FRAMES): number[] {
  return Array.from({ length: count }, (_, index) =>
    Math.floor((durationMs * (index + 1)) / (count + 1)),
  );
}
