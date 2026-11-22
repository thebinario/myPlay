import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LessonMediaIssueBadge } from '@/modules/courses/presentation/LessonMediaIssueBadge';

describe('LessonMediaIssueBadge', () => {
  it('avisa na lista de aulas que o arquivo está danificado, segundo o núcleo', () => {
    render(<LessonMediaIssueBadge playability="damaged" reason="Invalid data found" />);
    const badge = screen.getByTestId('lesson-media-issue');
    expect(badge.textContent).toBe('Arquivo danificado');
    expect(badge).toHaveAttribute('title', expect.stringContaining('Invalid data found'));
  });

  it('avisa quando o formato não é suportado', () => {
    render(<LessonMediaIssueBadge playability="unsupported" reason="codec de vídeo hevc" />);
    expect(screen.getByTestId('lesson-media-issue').textContent).toBe('Formato incompatível');
  });

  it('não mostra nada para arquivo reproduzível ou ainda não verificado', () => {
    const { container, rerender } = render(<LessonMediaIssueBadge playability="playable" />);
    expect(container.firstChild).toBeNull();
    rerender(<LessonMediaIssueBadge playability={null} />);
    expect(container.firstChild).toBeNull();
  });
});
