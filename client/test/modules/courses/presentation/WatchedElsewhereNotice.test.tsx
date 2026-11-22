import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WatchedElsewhereNotice } from '@/modules/courses/presentation/WatchedElsewhereNotice';

const watched = {
  lessonId: 'other',
  lessonTitle: 'Intro',
  courseId: 'c-old',
  courseTitle: 'Curso Antigo',
  watchedRatio: 0.95,
  completedAt: '2026-10-01T00:00:00Z',
};

describe('WatchedElsewhereNotice', () => {
  it('informa onde o mesmo conteúdo já foi assistido e permite reaproveitar', async () => {
    const onMarkAsWatched = vi.fn();
    render(<WatchedElsewhereNotice watchedElsewhere={watched} onMarkAsWatched={onMarkAsWatched} />);

    expect(screen.getByTestId('watched-elsewhere').textContent).toContain(
      'Já assistido em Curso Antigo (95%)',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Marcar como vista' }));
    expect(onMarkAsWatched).toHaveBeenCalledWith('other');
  });

  it('sem conclusão no outro curso, mostra só o progresso e não oferece a ação', () => {
    render(
      <WatchedElsewhereNotice
        watchedElsewhere={{ ...watched, completedAt: null, watchedRatio: 0.4 }}
        onMarkAsWatched={() => {}}
      />,
    );
    expect(screen.getByTestId('watched-elsewhere').textContent).toContain(
      'Em andamento em Curso Antigo (40%)',
    );
    expect(screen.queryByRole('button')).toBeNull();
  });
});
