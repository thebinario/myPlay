import { describe, it, expect } from 'vitest';
import {
  ZOOM_MAX,
  ZOOM_MIN,
  clampPage,
  fitPageScale,
  nextPage,
  normalizeReadingState,
  pageRange,
  previousPage,
  scrollRatio,
  toggleColorMode,
  zoomIn,
  zoomOut,
} from '@/modules/documents/domain/pdf-reading';

describe('pdf-reading — navegação e clamp', () => {
  it('avança a página respeitando o limite final', () => {
    expect(nextPage(1, 3)).toBe(2);
    expect(nextPage(3, 3)).toBe(3);
  });

  it('retrocede a página respeitando o limite inicial', () => {
    expect(previousPage(2)).toBe(1);
    expect(previousPage(1)).toBe(1);
  });

  it('mantém a página dentro de [1, totalPages]', () => {
    expect(clampPage(0, 10)).toBe(1);
    expect(clampPage(11, 10)).toBe(10);
    expect(clampPage(5, 10)).toBe(5);
  });
});

describe('pdf-reading — zoom e modo de cor', () => {
  it('aumenta e diminui o zoom em passos de 25%', () => {
    expect(zoomIn(1)).toBe(1.25);
    expect(zoomOut(1.25)).toBe(1);
  });

  it('respeita os limites de zoom', () => {
    expect(zoomIn(ZOOM_MAX)).toBe(ZOOM_MAX);
    expect(zoomOut(ZOOM_MIN)).toBe(ZOOM_MIN);
  });

  it('alterna entre modo escuro e original', () => {
    expect(toggleColorMode('dark')).toBe('original');
    expect(toggleColorMode('original')).toBe('dark');
  });
});

describe('pdf-reading — rolagem e janela de páginas', () => {
  it('ajusta a escala base do PDF à largura disponível e mantém o zoom proporcional', () => {
    expect(fitPageScale(1400, 720, 1)).toBeCloseTo(720 / 1400);
    expect(fitPageScale(1400, 720, 1.25)).toBeCloseTo((720 / 1400) * 1.25);
    expect(fitPageScale(600, 720, 1)).toBe(1);
  });

  it('calcula a janela de páginas em torno da página atual', () => {
    expect(pageRange(34, 120)).toEqual({ startPage: 33, endPage: 35 });
  });

  it('limita a janela nas bordas do documento', () => {
    expect(pageRange(1, 120)).toEqual({ startPage: 1, endPage: 2 });
    expect(pageRange(120, 120)).toEqual({ startPage: 119, endPage: 120 });
  });

  it('calcula a fração de rolagem e ignora container sem overflow', () => {
    expect(scrollRatio(50, 200, 100)).toBe(0.5);
    expect(scrollRatio(0, 100, 100)).toBe(0);
  });
});

describe('pdf-reading — estado de leitura normalizado', () => {
  it('aplica padrões para valores ausentes', () => {
    expect(
      normalizeReadingState({
        currentPage: 0,
        zoom: 0,
        colorMode: undefined as never,
        relativeScrollPosition: 0,
      }),
    ).toEqual({ currentPage: 1, zoom: 1, colorMode: 'dark', relativeScrollPosition: 0 });
  });
});
