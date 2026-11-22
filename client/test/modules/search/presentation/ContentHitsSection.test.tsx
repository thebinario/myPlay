import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {
  ContentHitView,
  ContentSearchRepository,
} from '@/modules/search/domain/content-search';
import { ContentSearchProvider } from '@/modules/search/presentation/ContentSearchProvider';
import { ContentHitsSection } from '@/modules/search/presentation/ContentHitsSection';
import { splitHighlights } from '@/modules/search/presentation/highlight';

const subtitleHit: ContentHitView = {
  chunkId: 1,
  sourceKind: 'subtitle',
  snippet: 'falamos sobre [[produção]] de vídeo',
  score: -3,
  mediaFileId: 'v1',
  language: 'pt-br',
  documentId: null,
  documentTitle: null,
  page: null,
  lessonId: 'l1',
  lessonTitle: 'Introdução',
  courseId: 'c1',
  courseTitle: 'Curso de Vídeo',
  startMs: 75_000,
  endMs: 80_000,
};

const pdfHit: ContentHitView = {
  ...subtitleHit,
  chunkId: 2,
  sourceKind: 'pdf',
  snippet: '[[docker]] compose',
  mediaFileId: 'p1',
  documentId: 'd1',
  documentTitle: 'Apostila.pdf',
  page: 12,
  lessonId: null,
  lessonTitle: null,
  courseId: null,
  courseTitle: null,
  startMs: null,
  endMs: null,
};

function renderSection(repository: ContentSearchRepository, query: string) {
  const onOpenLessonAt = vi.fn();
  const onOpenDocumentAt = vi.fn();
  render(
    <ContentSearchProvider repository={repository}>
      <ContentHitsSection
        query={query}
        onOpenLessonAt={onOpenLessonAt}
        onOpenDocumentAt={onOpenDocumentAt}
      />
    </ContentSearchProvider>,
  );
  return { onOpenLessonAt, onOpenDocumentAt };
}

describe('splitHighlights', () => {
  it('separa os termos destacados pelo backend', () => {
    expect(splitHighlights('a [[b]] c [[d]]')).toEqual([
      { text: 'a ', highlighted: false },
      { text: 'b', highlighted: true },
      { text: ' c ', highlighted: false },
      { text: 'd', highlighted: true },
    ]);
  });
});

describe('ContentHitsSection', () => {
  it('mostra trechos de legendas e PDFs e abre no ponto exato', async () => {
    const search = vi.fn(async () => [subtitleHit, pdfHit]);
    const { onOpenLessonAt, onOpenDocumentAt } = renderSection({ search }, 'produção');

    const lessonHit = await screen.findByRole('button', { name: /Introdução · 01:15/ });
    expect(screen.getByText('produção').tagName).toBe('MARK');
    await userEvent.click(lessonHit);
    expect(onOpenLessonAt).toHaveBeenCalledWith('c1', 'l1', 75);

    await userEvent.click(screen.getByRole('button', { name: /Apostila.pdf · página 12/ }));
    expect(onOpenDocumentAt).toHaveBeenCalledWith('d1', 12);
  });

  it('não consulta o backend com menos de 2 caracteres', async () => {
    const search = vi.fn(async () => []);
    renderSection({ search }, 'a');
    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(search).not.toHaveBeenCalled();
  });

  it('não mostra a seção quando não há trechos', async () => {
    const search = vi.fn(async () => []);
    renderSection({ search }, 'kubernetes');
    await waitFor(() => expect(search).toHaveBeenCalled());
    expect(screen.queryByText('Trechos encontrados')).toBeNull();
  });
});
