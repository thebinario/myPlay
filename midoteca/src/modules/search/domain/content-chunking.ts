/**
 * Splits extracted text into searchable chunks that keep their location
 * (PDF page or subtitle time range), so a hit can open the exact point.
 * Pure: extraction lives in adapters.
 */

export interface PageChunk {
  page: number;
  text: string;
}

export interface TimedChunk {
  startMs: number;
  endMs: number;
  text: string;
}

export interface Cue {
  startMs: number;
  endMs: number;
  text: string;
}

export interface PageChunkingOptions {
  maxChars?: number;
  overlapChars?: number;
}

const DEFAULT_MAX_CHARS = 800;
const DEFAULT_OVERLAP_CHARS = 120;
/** Subtitle cues are grouped in windows of this length. */
export const CUE_WINDOW_MS = 30_000;

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function splitWithOverlap(text: string, maxChars: number, overlapChars: number): string[] {
  if (text.length <= maxChars) return [text];
  const words = text.split(' ');
  const chunks: string[] = [];
  let current: string[] = [];
  let length = 0;
  for (const word of words) {
    if (length + word.length + 1 > maxChars && current.length > 0) {
      chunks.push(current.join(' '));
      const overlap: string[] = [];
      let overlapLength = 0;
      for (let i = current.length - 1; i >= 0; i--) {
        if (overlapLength + current[i].length + 1 > overlapChars) break;
        overlap.unshift(current[i]);
        overlapLength += current[i].length + 1;
      }
      current = overlap;
      length = overlapLength;
    }
    current.push(word.slice(0, maxChars));
    length += Math.min(word.length, maxChars) + 1;
  }
  if (current.length > 0) chunks.push(current.join(' '));
  return chunks;
}

export function chunkPages(pages: string[], options: PageChunkingOptions = {}): PageChunk[] {
  const maxChars = options.maxChars ?? DEFAULT_MAX_CHARS;
  const overlapChars = options.overlapChars ?? DEFAULT_OVERLAP_CHARS;
  return pages.flatMap((raw, index) => {
    const text = normalizeWhitespace(raw);
    if (!text) return [];
    return splitWithOverlap(text, maxChars, overlapChars).map((chunk) => ({
      page: index + 1,
      text: chunk,
    }));
  });
}

export function chunkCues(cues: Cue[], windowMs = CUE_WINDOW_MS): TimedChunk[] {
  const chunks: TimedChunk[] = [];
  let current: TimedChunk | null = null;
  for (const cue of cues) {
    const text = normalizeWhitespace(cue.text);
    if (!text) continue;
    if (current && cue.startMs - current.startMs < windowMs) {
      current.endMs = Math.max(current.endMs, cue.endMs);
      current.text = `${current.text} ${text}`;
    } else {
      current = { startMs: cue.startMs, endMs: cue.endMs, text };
      chunks.push(current);
    }
  }
  return chunks;
}

/**
 * Turns free text into a safe FTS5 query: every term quoted (no operators or
 * column filters leak in), all terms required, the last one as a prefix so
 * results appear while typing. Returns null when nothing searchable remains.
 */
export function toFtsQuery(text: string): string | null {
  const terms = text
    .split(/\s+/)
    .map((term) => term.replace(/["*()^:{}[\]]/g, ''))
    .filter((term) => term.length > 0);
  if (terms.length === 0) return null;
  return terms.map((term, index) => `"${term}"${index === terms.length - 1 ? '*' : ''}`).join(' ');
}
