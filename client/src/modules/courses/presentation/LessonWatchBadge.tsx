import React from 'react';
import type { Lesson } from '@/core/domain/library';

interface LessonWatchBadgeProps {
  watchedRatio: Lesson['watchedRatio'];
  completed: boolean;
  completionSource: Lesson['completionSource'];
}

const badgeStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  color: '#A594FF',
  background: 'rgba(165, 148, 255, 0.12)',
  borderRadius: '999px',
  padding: '2px 8px',
  whiteSpace: 'nowrap',
};

/**
 * Apresenta a cobertura real calculada pelo backend ("Assistido 62%") e a
 * origem manual da conclusão. Não calcula nada: só formata o read model.
 */
export const LessonWatchBadge: React.FC<LessonWatchBadgeProps> = ({
  watchedRatio,
  completed,
  completionSource,
}) => {
  let label: string | null = null;
  if (completed && completionSource === 'manual') label = 'Marcada manualmente';
  else if (completed && completionSource === 'duplicate') label = 'Vista em outro curso';
  else if (!completed && watchedRatio != null && watchedRatio > 0) {
    label = `Assistido ${Math.round(watchedRatio * 100)}%`;
  }
  if (!label) return null;

  return (
    <span data-testid="lesson-watch-badge" style={badgeStyle}>
      {label}
    </span>
  );
};
