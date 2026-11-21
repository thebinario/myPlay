import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LessonWatchBadge } from '@/modules/courses/presentation/LessonWatchBadge';

describe('LessonWatchBadge', () => {
  it('mostra quanto da aula foi realmente assistido, segundo o backend', () => {
    render(<LessonWatchBadge watchedRatio={0.623} completed={false} completionSource={null} />);
    expect(screen.getByTestId('lesson-watch-badge').textContent).toBe('Assistido 62%');
  });

  it('indica quando a conclusão foi manual', () => {
    render(<LessonWatchBadge watchedRatio={0.1} completed completionSource="manual" />);
    expect(screen.getByTestId('lesson-watch-badge').textContent).toBe('Marcada manualmente');
  });

  it('não renderiza nada sem progresso conhecido', () => {
    const { container } = render(
      <LessonWatchBadge watchedRatio={null} completed={false} completionSource={null} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('não repete o selo quando a aula foi concluída assistindo', () => {
    const { container } = render(
      <LessonWatchBadge watchedRatio={0.97} completed completionSource="watched" />,
    );
    expect(container.firstChild).toBeNull();
  });
});
