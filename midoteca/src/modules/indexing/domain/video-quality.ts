import { naturalCompare } from '../../../core/catalog-order';

/** Vertical resolution read from a file name (`1080p`), used to rank encodings. */
export function resolutionScore(relativePath: string): number {
  const match = relativePath.toLowerCase().match(/(\d{3,4})[pi]\b/);
  if (match) return Number.parseInt(match[1], 10);
  if (relativePath.toLowerCase().endsWith('.webm')) return 720;
  return 0;
}

/** Orders the encodings of one lesson best-first (the first one is played). */
export function sortVideosByQuality(videos: readonly string[]): string[] {
  return [...videos].sort((a, b) => {
    const score = resolutionScore(b) - resolutionScore(a);
    if (score !== 0) return score;
    return naturalCompare(a, b);
  });
}
