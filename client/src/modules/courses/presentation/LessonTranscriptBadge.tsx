import React from 'react';
import type { Lesson } from '@/core/domain/library';

interface LessonTranscriptBadgeProps {
  transcription: Lesson['transcription'];
  error?: string | null;
}

const VIEW = {
  transcribed: { label: 'Transcrita', color: '#94A3B8', background: 'rgba(148, 163, 184, 0.12)' },
  transcribing: {
    label: 'Transcrevendo…',
    color: '#C4B5FD',
    background: 'rgba(165, 148, 255, 0.12)',
  },
  failed: {
    label: 'Falha na transcrição',
    color: '#FCA5A5',
    background: 'rgba(239, 68, 68, 0.12)',
  },
} as const;

/** Apresenta o estado da transcrição que o núcleo decidiu; o motivo da falha fica no tooltip. */
export const LessonTranscriptBadge: React.FC<LessonTranscriptBadgeProps> = ({
  transcription,
  error,
}) => {
  if (!transcription) return null;
  const { label, color, background } = VIEW[transcription];
  const description = transcription === 'failed' && error ? `${label}: ${error}` : label;
  return (
    <span
      data-testid="lesson-transcript"
      role="status"
      aria-label={description}
      title={description}
      style={{
        fontSize: '11px',
        fontWeight: 600,
        color,
        background,
        borderRadius: '999px',
        padding: '2px 8px',
        whiteSpace: 'nowrap',
        cursor: transcription === 'failed' ? 'help' : 'default',
      }}
    >
      {label}
    </span>
  );
};
