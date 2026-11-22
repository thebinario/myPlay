import { describe, expect, it } from 'vitest';
import {
  chunkCues,
  chunkPages,
  toFtsQuery,
} from '../../../../src/modules/search/domain/content-chunking';

describe('chunkPages', () => {
  it('keeps one chunk per short page, with its 1-based page number', () => {
    expect(chunkPages(['Página um.', '   ', 'Página três.'])).toEqual([
      { page: 1, text: 'Página um.' },
      { page: 3, text: 'Página três.' },
    ]);
  });

  it('splits long pages on word boundaries with overlap', () => {
    const words = Array.from({ length: 400 }, (_, i) => `palavra${i}`).join(' ');
    const chunks = chunkPages([words], { maxChars: 500, overlapChars: 50 });
    expect(chunks.length).toBeGreaterThan(5);
    expect(chunks.every((chunk) => chunk.text.length <= 500)).toBe(true);
    expect(chunks.every((chunk) => chunk.page === 1)).toBe(true);
    // Overlap: the start of a chunk repeats the end of the previous one.
    const lastWordOfFirst = chunks[0].text.split(' ').at(-1)!;
    expect(chunks[1].text).toContain(lastWordOfFirst);
  });

  it('normalizes whitespace', () => {
    expect(chunkPages(['a\n\n  b\tc'])[0].text).toBe('a b c');
  });
});

describe('chunkCues', () => {
  it('groups subtitle cues in ~30s windows keeping the time range', () => {
    const cues = [
      { startMs: 0, endMs: 4_000, text: 'Olá' },
      { startMs: 5_000, endMs: 9_000, text: 'bem-vindo' },
      { startMs: 31_000, endMs: 35_000, text: 'segunda janela' },
    ];
    expect(chunkCues(cues)).toEqual([
      { startMs: 0, endMs: 9_000, text: 'Olá bem-vindo' },
      { startMs: 31_000, endMs: 35_000, text: 'segunda janela' },
    ]);
  });

  it('ignores empty cues', () => {
    expect(chunkCues([{ startMs: 0, endMs: 1, text: '  ' }])).toEqual([]);
  });
});

describe('toFtsQuery', () => {
  it('quotes each term and prefix-matches the last one', () => {
    expect(toFtsQuery('produção de vídeo')).toBe('"produção" "de" "vídeo"*');
  });

  it('neutralizes FTS syntax typed by the user', () => {
    expect(toFtsQuery('a"b OR c* NEAR(')).toBe('"ab" "OR" "c" "NEAR"*');
  });

  it('returns null for blank input', () => {
    expect(toFtsQuery('  " *  ')).toBeNull();
  });
});
