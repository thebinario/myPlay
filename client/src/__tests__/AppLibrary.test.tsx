/**
 * MIDOTECA — Fase 1: integração App ↔ repositório (fonte única de verdade).
 * Garante que mutações no repositório se refletem na UI sem estado duplicado.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import App from '@/app/App';
import {
  MOCK_COURSES,
  mockLibraryService,
} from '@/modules/library/infrastructure/mock-library-repository';

const inProgressCourse = MOCK_COURSES.find((c) => c.progress > 0 && c.progress < 100)!;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

describe('App — fonte única de verdade do catálogo', () => {
  beforeEach(() => mockLibraryService.resetAll());

  it('atualiza o progresso na tela de detalhes ao concluir uma aula (sem estado local duplicado)', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByTestId(`home-course-${inProgressCourse.id}`));
    const initialProgress = Number(screen.getByText(/% concluído/).textContent?.match(/\d+/)?.[0]);

    const lesson = inProgressCourse.modules.flatMap((m) => m.lessons).find((l) => !l.completed)!;
    await user.click(
      screen.getByLabelText(new RegExp(`marcar ${escapeRegExp(lesson.title)} como concluída`, 'i')),
    );

    const updated = mockLibraryService.getCourseById(inProgressCourse.id)!;
    expect(updated.progress).not.toBe(inProgressCourse.progress);
    const updatedProgress = Number(screen.getByText(/% concluído/).textContent?.match(/\d+/)?.[0]);
    expect(updatedProgress).toBeGreaterThan(initialProgress);
  });

  it('inicia o player do projeto ao escolher uma aula para reproduzir', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByTestId(`home-course-${inProgressCourse.id}`));
    const lesson = inProgressCourse.modules.flatMap((module) => module.lessons)[0];
    await user.click(screen.getByLabelText(`Assistir aula ${lesson.title}`));

    expect(await screen.findByText(lesson.title)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId('player-status')).toHaveTextContent('Reproduzindo'),
    );
  });
});
