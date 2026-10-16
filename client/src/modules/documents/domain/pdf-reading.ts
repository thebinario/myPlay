import type { PdfColorMode, PdfReadingState } from '@/core/domain/library';

/** Limites e passo de zoom do leitor de PDF. */
export const ZOOM_MIN = 0.6;
export const ZOOM_MAX = 2;
export const ZOOM_STEP = 0.25;

const round2 = (value: number): number => Math.round(value * 100) / 100;

/** Normaliza um estado de leitura vindo da persistência, aplicando padrões. */
export function normalizeReadingState(state: PdfReadingState): PdfReadingState {
  return {
    currentPage: state.currentPage || 1,
    zoom: state.zoom || 1,
    colorMode: state.colorMode || 'dark',
    relativeScrollPosition: state.relativeScrollPosition || 0,
    lastAccessedAt: state.lastAccessedAt,
    completedAt: state.completedAt,
  };
}

/** Garante que a página esteja dentro de [1, totalPages]. */
export function clampPage(page: number, totalPages: number): number {
  return Math.min(Math.max(1, page), Math.max(1, totalPages));
}

export function nextPage(current: number, totalPages: number): number {
  return current < totalPages ? current + 1 : current;
}

export function previousPage(current: number): number {
  return current > 1 ? current - 1 : current;
}

export function zoomIn(current: number): number {
  return Math.min(ZOOM_MAX, round2(current + ZOOM_STEP));
}

export function zoomOut(current: number): number {
  return Math.max(ZOOM_MIN, round2(current - ZOOM_STEP));
}

export function toggleColorMode(mode: PdfColorMode): PdfColorMode {
  return mode === 'dark' ? 'original' : 'dark';
}

/** Fits the page to the available width at 100%; user zoom is applied afterward. */
export function fitPageScale(pageWidth: number, availableWidth: number, zoom: number): number {
  if (pageWidth <= 0 || availableWidth <= 0) return zoom;
  return (availableWidth / pageWidth) * zoom;
}

/** Janela de páginas pré-carregadas em torno da página atual. */
export function pageRange(
  page: number,
  totalPages: number,
  radius = 1,
): { startPage: number; endPage: number } {
  return {
    startPage: Math.max(1, page - radius),
    endPage: Math.min(totalPages, page + radius),
  };
}

/** Fração de rolagem (0..1) a partir das métricas do container. */
export function scrollRatio(scrollTop: number, scrollHeight: number, clientHeight: number): number {
  const maxScroll = scrollHeight - clientHeight;
  if (maxScroll <= 0) return 0;
  const ratio = scrollTop / maxScroll;
  return Math.min(1, Math.max(0, ratio));
}
