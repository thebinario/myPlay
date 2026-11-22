import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LessonTranscriptBadge } from '@/modules/courses/presentation/LessonTranscriptBadge';

describe('LessonTranscriptBadge', () => {
  it('indica a aula já transcrita', () => {
    render(<LessonTranscriptBadge transcription="transcribed" />);
    expect(screen.getByTestId('lesson-transcript').textContent).toBe('Transcrita');
  });

  it('indica a transcrição em andamento', () => {
    render(<LessonTranscriptBadge transcription="transcribing" />);
    expect(screen.getByTestId('lesson-transcript').textContent).toBe('Transcrevendo…');
  });

  it('mostra a falha com o motivo no tooltip e no nome acessível', () => {
    render(
      <LessonTranscriptBadge transcription="failed" error="Áudio ilegível: stream truncado" />,
    );
    const badge = screen.getByTestId('lesson-transcript');
    expect(badge.textContent).toBe('Falha na transcrição');
    expect(badge).toHaveAttribute('title', 'Falha na transcrição: Áudio ilegível: stream truncado');
    expect(badge).toHaveAccessibleName('Falha na transcrição: Áudio ilegível: stream truncado');
  });

  it('não mostra nada quando a aula não foi transcrita', () => {
    const { container } = render(<LessonTranscriptBadge transcription={null} />);
    expect(container.firstChild).toBeNull();
  });
});
