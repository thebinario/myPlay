import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { DuplicatesRepository } from '@/modules/library/domain/duplicates';
import { DuplicatesProvider } from '@/modules/library/presentation/DuplicatesProvider';
import { DuplicateGroupsPanel } from '@/modules/library/presentation/components/DuplicateGroupsPanel';

const repository: DuplicatesRepository = {
  listGroups: async () => [
    {
      kind: 'perceptual',
      members: [
        {
          mediaFileId: 'm1',
          sourceId: 's1',
          relativePath: 'Curso A/01 - Intro.mp4',
          mediaType: 'video',
          fileSize: 100,
          durationMs: 600_000,
          lessons: [
            {
              lessonId: 'l1',
              lessonTitle: 'Intro',
              courseId: 'c1',
              courseTitle: 'Curso A',
              watchedRatio: 0.95,
              completedAt: '2026-10-01T00:00:00Z',
            },
          ],
          documents: [],
        },
        {
          mediaFileId: 'm2',
          sourceId: 's1',
          relativePath: 'Curso B/01 - Intro 480p.mp4',
          mediaType: 'video',
          fileSize: 50,
          durationMs: 601_000,
          lessons: [
            {
              lessonId: 'l2',
              lessonTitle: 'Intro',
              courseId: 'c2',
              courseTitle: 'Curso B',
              watchedRatio: null,
              completedAt: null,
            },
          ],
          documents: [],
        },
      ],
    },
  ],
  analysisStatus: async () => ({ pending: 3, analyzed: 10, failed: 0 }),
};

describe('DuplicateGroupsPanel', () => {
  it('lista os grupos fornecidos pelo backend com o progresso de cada cópia', async () => {
    render(
      <DuplicatesProvider repository={repository}>
        <DuplicateGroupsPanel />
      </DuplicatesProvider>,
    );

    expect(await screen.findByText('Curso B/01 - Intro 480p.mp4')).toBeInTheDocument();
    expect(screen.getByText('Mesmo conteúdo recodificado')).toBeInTheDocument();
    expect(screen.getByText('Curso A · Intro — assistida')).toBeInTheDocument();
    expect(screen.getByText('Curso B · Intro — não assistida')).toBeInTheDocument();
    expect(screen.getByTestId('duplicate-analysis-status').textContent).toBe(
      '10 analisados · 3 na fila',
    );
  });

  it('mostra o estado vazio', async () => {
    render(
      <DuplicatesProvider repository={{ ...repository, listGroups: async () => [] }}>
        <DuplicateGroupsPanel />
      </DuplicatesProvider>,
    );
    expect(await screen.findByText('Nenhum conteúdo duplicado encontrado.')).toBeInTheDocument();
  });
});
