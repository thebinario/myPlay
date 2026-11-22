import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {
  AnswerView,
  AssistantRepository,
  AnswerSourceView,
} from '@/modules/assistant/domain/assistant';
import { AssistantProvider } from '@/modules/assistant/presentation/AssistantProvider';
import { AssistantPanel } from '@/modules/assistant/presentation/AssistantPanel';

const video: AnswerSourceView = {
  index: 1,
  label: 'Curso Docker · Instalação (01:15)',
  sourceKind: 'subtitle',
  snippet: 'use o instalador oficial',
  lessonId: 'l1',
  courseId: 'c1',
  documentId: null,
  page: null,
  startMs: 75_000,
};
const pdf: AnswerSourceView = {
  ...video,
  index: 2,
  label: 'Apostila.pdf · página 2',
  sourceKind: 'pdf',
  lessonId: null,
  courseId: null,
  documentId: 'd1',
  page: 2,
  startMs: null,
};
const answer: AnswerView = {
  text: 'Use o instalador oficial [1]. Veja também [2].',
  sources: [video, pdf],
  citations: [video, pdf],
};

function streamingRepository(): AssistantRepository {
  return {
    ask: (_input, handlers) => {
      setTimeout(() => {
        handlers.onToken('Use o instalador ');
        handlers.onToken('oficial [1]. Veja também [2].');
        handlers.onDone(answer);
      }, 0);
      return { cancel: vi.fn(async () => {}) };
    },
  };
}

function renderPanel(repository: AssistantRepository) {
  const onOpenLessonAt = vi.fn();
  const onOpenDocumentAt = vi.fn();
  render(
    <AssistantProvider repository={repository}>
      <AssistantPanel
        initialQuestion="Como instalar o Docker?"
        onOpenLessonAt={onOpenLessonAt}
        onOpenDocumentAt={onOpenDocumentAt}
      />
    </AssistantProvider>,
  );
  return { onOpenLessonAt, onOpenDocumentAt };
}

describe('AssistantPanel', () => {
  it('mostra a resposta em streaming e as citações que abrem o ponto exato', async () => {
    const { onOpenLessonAt, onOpenDocumentAt } = renderPanel(streamingRepository());

    await userEvent.click(screen.getByRole('button', { name: 'Perguntar à biblioteca' }));

    expect(await screen.findByText(/Use o instalador oficial/)).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: /\[1\] Curso Docker · Instalação \(01:15\)/ }),
    );
    expect(onOpenLessonAt).toHaveBeenCalledWith('c1', 'l1', 75);
    await userEvent.click(screen.getByRole('button', { name: /\[2\] Apostila.pdf · página 2/ }));
    expect(onOpenDocumentAt).toHaveBeenCalledWith('d1', 2);
  });

  it('mostra o erro devolvido pelo backend', async () => {
    renderPanel({
      ask: (_input, handlers) => {
        setTimeout(() => handlers.onError('Modelo indisponível'), 0);
        return { cancel: async () => {} };
      },
    });

    await userEvent.click(screen.getByRole('button', { name: 'Perguntar à biblioteca' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Modelo indisponível');
  });

  it('não aparece sem assistente disponível (modo demonstração)', () => {
    const { container } = render(
      <AssistantPanel initialQuestion="x" onOpenLessonAt={vi.fn()} onOpenDocumentAt={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
