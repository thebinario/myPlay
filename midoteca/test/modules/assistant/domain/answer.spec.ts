import { describe, expect, it } from 'vitest';
import {
  NO_SOURCES_ANSWER,
  buildPrompt,
  extractCitations,
} from '../../../../src/modules/assistant/domain/answer';

const sources = [
  {
    index: 1,
    label: 'Curso A · Introdução (01:15)',
    text: 'Para instalar o Docker use o instalador.',
  },
  { index: 2, label: 'Apostila.pdf · página 3', text: 'O Compose orquestra vários contêineres.' },
];

describe('buildPrompt', () => {
  it('numbers the sources and instructs to answer only from them, citing [n]', () => {
    const { system, user } = buildPrompt('Como instalo o Docker?', sources);
    expect(system).toMatch(/somente/i);
    expect(system).toMatch(/\[n\]/);
    expect(user).toContain('[1] Curso A · Introdução (01:15)');
    expect(user).toContain('Para instalar o Docker use o instalador.');
    expect(user).toContain('[2] Apostila.pdf · página 3');
    expect(user.trim().endsWith('Pergunta: Como instalo o Docker?')).toBe(true);
  });
});

describe('extractCitations', () => {
  it('returns the cited source indexes in order of first appearance', () => {
    expect(extractCitations('Use o instalador [1]. O Compose ajuda [2][1].', 2)).toEqual([1, 2]);
  });

  it('ignores citations to sources that were not retrieved', () => {
    expect(extractCitations('Veja [3] e [1].', 2)).toEqual([1]);
  });

  it('accepts grouped citations like [1, 2]', () => {
    expect(extractCitations('Ambos explicam [1, 2].', 2)).toEqual([1, 2]);
  });
});

describe('NO_SOURCES_ANSWER', () => {
  it('is an honest answer in Portuguese', () => {
    expect(NO_SOURCES_ANSWER).toMatch(/não encontrei/i);
  });
});
