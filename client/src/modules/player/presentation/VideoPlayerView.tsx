import React from 'react';
import { ArrowLeft } from 'lucide-react';
import type { Course } from '@/core/domain/library';
import { useVideoPlayer } from '@/modules/player/presentation/hooks/useVideoPlayer';
import { PlayerSurface } from '@/modules/player/presentation/PlayerSurface';

interface VideoPlayerViewProps {
  course: Course;
  initialLessonId: string;
  onBack: () => void;
  onCompleteLesson?: (lessonId: string) => void;
  /** Tempo de inatividade antes de ocultar os controles durante a reprodução (ms). */
  controlsAutoHideDelayMs?: number;
  /** Posição de retomada (sobrepõe o progresso persistido), em segundos. */
  resumeTime?: number;
  /** Inicia a reprodução automaticamente ao carregar (usado ao restaurar o mini player). */
  autoPlay?: boolean;
  /** Reporta o estado de reprodução atual (usado pelo mini player). */
  onProgress?: (snapshot: { currentTime: number; isPlaying: boolean }) => void;
}

export const VideoPlayerView: React.FC<VideoPlayerViewProps> = ({
  course,
  initialLessonId,
  onBack,
  onCompleteLesson,
  controlsAutoHideDelayMs,
  resumeTime,
  autoPlay,
  onProgress,
}) => {
  const player = useVideoPlayer({
    course,
    initialLessonId,
    controlsAutoHideDelayMs,
    resumeTime,
    autoPlay,
    onCompleteLesson,
    onProgress,
  });

  const statusLabel = player.hasError
    ? 'Indisponível'
    : player.hasEnded
      ? 'Concluída'
      : player.isLoading
        ? 'Carregando'
        : player.isBuffering
          ? 'Armazenando'
          : player.isSeeking
            ? 'Buscando'
            : player.isPlaying
              ? 'Reproduzindo'
              : 'Pausado';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        backgroundColor: '#0D111B',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: '#121622',
        }}
      >
        <button
          onClick={onBack}
          aria-label="Voltar para detalhes do curso"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'transparent',
            border: 'none',
            color: '#94A3B8',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            padding: '6px 10px',
            borderRadius: '6px',
          }}
        >
          <ArrowLeft size={16} />
          Voltar
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#A594FF', fontWeight: 600 }}>
            {course.title}
          </span>
          <h2 style={{ fontSize: '15px', color: '#F0F4FC', fontWeight: 700, margin: 0 }}>
            {player.currentLesson.title}
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            data-testid="player-status"
            style={{
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: player.hasError
                ? '#F87171'
                : player.hasEnded
                  ? '#10B981'
                  : player.isPlaying
                    ? '#A594FF'
                    : '#64748B',
            }}
          >
            {statusLabel}
          </span>
          <span style={{ fontSize: '12px', color: '#64748B' }}>
            Aula {player.currentLessonIndex + 1} de {player.totalLessons}
          </span>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          overflow: 'hidden',
        }}
      >
        <PlayerSurface player={player} />
      </div>
    </div>
  );
};
