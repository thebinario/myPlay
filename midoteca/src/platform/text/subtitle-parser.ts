import type { Cue } from '../../core/domain/subtitles';

const TIMING =
  /^\s*((?:\d+:)?\d{1,2}:\d{2}[.,]\d{1,3})\s*-->\s*((?:\d+:)?\d{1,2}:\d{2}[.,]\d{1,3})/;

function toMs(stamp: string): number {
  const [clock, fraction = '0'] = stamp.replace(',', '.').split('.');
  const parts = clock.split(':').map(Number);
  while (parts.length < 3) parts.unshift(0);
  const [hours, minutes, seconds] = parts;
  return ((hours * 60 + minutes) * 60 + seconds) * 1000 + Number(fraction.padEnd(3, '0'));
}

function cleanText(lines: string[]): string {
  return lines
    .join(' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\{\\[^}]*\}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Parses SRT and WebVTT into cues (tags stripped). Malformed blocks are skipped. */
export function parseSubtitles(content: string): Cue[] {
  const blocks = content
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/);
  const cues: Cue[] = [];
  for (const block of blocks) {
    const lines = block.split('\n').filter((line) => line.trim() !== '');
    const timingIndex = lines.findIndex((line) => TIMING.test(line));
    if (timingIndex < 0) continue;
    const [, start, end] = TIMING.exec(lines[timingIndex]) ?? [];
    const text = cleanText(lines.slice(timingIndex + 1));
    if (!text) continue;
    cues.push({ startMs: toMs(start), endMs: toMs(end), text });
  }
  return cues;
}
