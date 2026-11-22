import { describe, expect, it } from 'vitest';
import { activeCueText, subtitleLabel } from '@/modules/player/domain/subtitles';

describe('activeCueText', () => {
  const cues = [
    { startMs: 1_000, endMs: 3_000, text: 'Olá' },
    { startMs: 5_000, endMs: 8_000, text: 'Mundo' },
  ];

  it('retorna o texto do trecho no instante atual', () => {
    expect(activeCueText(cues, 2)).toBe('Olá');
    expect(activeCueText(cues, 5)).toBe('Mundo');
  });

  it('retorna null entre trechos', () => {
    expect(activeCueText(cues, 4)).toBeNull();
    expect(activeCueText([], 1)).toBeNull();
  });
});

describe('subtitleLabel', () => {
  it('nomeia a faixa pelo idioma e indica legendas geradas', () => {
    expect(subtitleLabel('pt', false)).toBe('Português');
    expect(subtitleLabel('pt', true)).toBe('Português (gerada automaticamente)');
    expect(subtitleLabel('en', false)).toBe('Inglês');
    expect(subtitleLabel(null, false)).toBe('Legenda');
  });
});
