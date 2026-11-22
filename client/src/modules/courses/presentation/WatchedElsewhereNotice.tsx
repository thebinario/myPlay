import React from 'react';
import type { Lesson } from '@/core/domain/library';

interface WatchedElsewhereNoticeProps {
  watchedElsewhere: NonNullable<Lesson['watchedElsewhere']>;
  onMarkAsWatched: (fromLessonId: string) => void;
}

/**
 * Aviso de que o mesmo conteúdo (cópia ou recodificação, detectada pelo
 * backend) já foi assistido em outro curso. Reaproveitar a conclusão é uma
 * ação explícita; o backend valida se as aulas são de fato duplicadas.
 */
export const WatchedElsewhereNotice: React.FC<WatchedElsewhereNoticeProps> = ({
  watchedElsewhere,
  onMarkAsWatched,
}) => {
  const percent =
    watchedElsewhere.watchedRatio != null
      ? ` (${Math.round(watchedElsewhere.watchedRatio * 100)}%)`
      : '';
  const done = !!watchedElsewhere.completedAt;

  return (
    <span
      data-testid="watched-elsewhere"
      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}
    >
      <span style={{ color: '#FBBF24' }}>
        {done ? 'Já assistido em ' : 'Em andamento em '}
        {watchedElsewhere.courseTitle}
        {percent}
      </span>
      {done && (
        <button
          type="button"
          onClick={() => onMarkAsWatched(watchedElsewhere.lessonId)}
          style={{
            background: 'rgba(251, 191, 36, 0.12)',
            color: '#FBBF24',
            border: 'none',
            borderRadius: '6px',
            padding: '2px 8px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Marcar como vista
        </button>
      )}
    </span>
  );
};
