import React from 'react';
import type { Lesson } from '@/core/domain/library';

interface LessonMediaIssueBadgeProps {
  playability: Lesson['playability'];
  reason?: string | null;
}

const LABELS = {
  damaged: 'Arquivo danificado',
  unsupported: 'Formato incompatível',
} as const;

const badgeStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  color: '#FCA5A5',
  background: 'rgba(239, 68, 68, 0.12)',
  borderRadius: '999px',
  padding: '2px 8px',
  whiteSpace: 'nowrap',
};

/** Apresenta o veredito do núcleo sobre o arquivo da aula; não decide nada. */
export const LessonMediaIssueBadge: React.FC<LessonMediaIssueBadgeProps> = ({
  playability,
  reason,
}) => {
  if (playability !== 'damaged' && playability !== 'unsupported') return null;
  const label = LABELS[playability];
  return (
    <span
      data-testid="lesson-media-issue"
      title={reason ? `${label}: ${reason}` : label}
      style={badgeStyle}
    >
      {label}
    </span>
  );
};
