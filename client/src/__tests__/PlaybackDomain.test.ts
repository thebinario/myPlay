import { describe, it, expect } from 'vitest';
import type { Course } from '@/core/domain/library';
import {
  clampSeekTime,
  formatSeconds,
  ratioFromOffset,
  seekTimeFromRatio,
} from '@/modules/player/domain/progress';
import {
  lessonsOf,
  loadingLabelFor,
  nextLessonIndex,
  previousLessonIndex,
} from '@/modules/player/domain/playlist';

describe('player/progress — tempo', () => {
  it('formata segundos como MM:SS com minutos preenchidos', () => {
    expect(formatSeconds(0)).toBe('00:00');
    expect(formatSeconds(120)).toBe('02:00');
    expect(formatSeconds(-5)).toBe('00:00');
  });

  it('limita o instante ao intervalo conhecido', () => {
    expect(clampSeekTime(130, 120)).toBe(120);
    expect(clampSeekTime(-10, 120)).toBe(0);
    expect(clampSeekTime(50, 120)).toBe(50);
  });

  it('permite tempo não limitado a zero quando a duração é desconhecida', () => {
    expect(clampSeekTime(-10, 0)).toBe(0);
    expect(clampSeekTime(42, 0)).toBe(42);
  });

  it('deriva o tempo de destino a partir da fração clicada', () => {
    expect(seekTimeFromRatio(0.5, 200)).toBe(100);
  });

  it('calcula a fração da barra e ignora largura inválida', () => {
    expect(ratioFromOffset(50, 200)).toBe(0.25);
    expect(ratioFromOffset(50, 0)).toBeNull();
  });
});

describe('player/playlist — navegação de aulas', () => {
  const course = {
    modules: [{ lessons: [{ id: 'l1' }, { id: 'l2' }] }, { lessons: [{ id: 'l3' }] }],
  } as unknown as Course;

  it('achata as aulas de todos os módulos na ordem', () => {
    expect(lessonsOf(course).map((l) => l.id)).toEqual(['l1', 'l2', 'l3']);
  });

  it('avança mantendo o índice no fim da lista', () => {
    expect(nextLessonIndex(0, 3)).toBe(1);
    expect(nextLessonIndex(2, 3)).toBe(2);
  });

  it('retrocede mantendo o índice no início da lista', () => {
    expect(previousLessonIndex(2)).toBe(1);
    expect(previousLessonIndex(0)).toBe(0);
  });

  it('rotaciona os rótulos de carregamento', () => {
    expect(loadingLabelFor(0)).toBe('Carregando aula...');
    expect(loadingLabelFor(3)).toBe('Carregando aula...');
  });
});
