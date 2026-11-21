import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from 'storybook/test';
import type { ContentHitView } from '@/modules/search/domain/content-search';
import { ContentSearchProvider } from '@/modules/search/presentation/ContentSearchProvider';
import { ContentHitsSection } from '@/modules/search/presentation/ContentHitsSection';

const base: ContentHitView = {
  chunkId: 1,
  sourceKind: 'subtitle',
  snippet: 'Nesta aula falamos sobre [[produção]] de vídeo para cursos online.',
  score: -4,
  mediaFileId: 'v1',
  language: 'pt-br',
  documentId: null,
  documentTitle: null,
  page: null,
  lessonId: 'les-1',
  lessonTitle: '01 - Introdução',
  courseId: 'course-1',
  courseTitle: 'Produção Audiovisual',
  startMs: 95_000,
  endMs: 120_000,
};

const hits: ContentHitView[] = [
  base,
  {
    ...base,
    chunkId: 2,
    sourceKind: 'pdf',
    snippet: 'Capítulo 4 — Roteiro e [[produção]] executiva',
    mediaFileId: 'p1',
    documentId: 'doc-1',
    documentTitle: 'Apostila de Produção.pdf',
    page: 37,
    lessonId: null,
    lessonTitle: null,
    courseId: null,
    courseTitle: null,
    startMs: null,
    endMs: null,
  },
  { ...base, chunkId: 3, sourceKind: 'transcript', startMs: 1_830_000, lessonTitle: '07 - Edição' },
];

const meta: Meta<typeof ContentHitsSection> = {
  title: 'Search/ContentHitsSection',
  component: ContentHitsSection,
  tags: ['autodocs'],
  parameters: { background: { default: '#0D111B' } },
  args: { query: 'produção', onOpenLessonAt: fn(), onOpenDocumentAt: fn() },
  decorators: [
    (Story) => (
      <ContentSearchProvider repository={{ search: async () => hits }}>
        <Story />
      </ContentSearchProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ContentHitsSection>;

/** Trechos de legenda, PDF e transcrição; clicar abre no ponto exato. */
export const WithHits: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole('button', { name: /Apostila de Produção.pdf · página 37/ }),
    );
    await expect(args.onOpenDocumentAt).toHaveBeenCalledWith('doc-1', 37);
  },
};
