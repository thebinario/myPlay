import React, { useMemo, useRef } from 'react';
import { Play, Pause, X, Maximize2, RotateCcw } from 'lucide-react';
import { Spinner } from '../ui/Spinner';
import { useMediaElementPlayback } from './useMediaElementPlayback';

export interface MiniPlayerProps {
  title: string;
  /** Texto secundário (ex.: nome do curso). */
  subtitle?: string;
  /** Arquivo de vídeo reproduzido. */
  videoUrl: string;
  /** Miniatura exibida como poster. */
  thumbnailUrl?: string;
  /** Duração total em segundos. */
  duration: number;
  /** Posição de retomada em segundos. */
  initialTime?: number;
  /** Continua reproduzindo assim que a mídia carregar. */
  autoPlay?: boolean;
  /** Cor de destaque (violeta para aulas, verde para filmes). */
  accentColor?: string;
  /** Clique no mini player → volta para a tela cheia do player. */
  onExpand: () => void;
  /** Fecha e encerra a sessão de reprodução. */
  onClose: () => void;
  /** Reporta o estado de reprodução atual. */
  onProgress?: (snapshot: { currentTime: number; isPlaying: boolean }) => void;
}

function formatTime(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = Math.floor(safe % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({
  title,
  subtitle,
  videoUrl,
  thumbnailUrl,
  duration,
  initialTime = 0,
  autoPlay = false,
  accentColor = '#A594FF',
  onExpand,
  onClose,
  onProgress,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const {
    isPlaying,
    currentTime,
    duration: mediaDuration,
    isLoading,
    isBuffering,
    hasEnded,
    hasError,
    toggle,
    replay,
    skip,
  } = useMediaElementPlayback({
    videoRef,
    src: videoUrl,
    fallbackDuration: duration,
    initialTime,
    autoPlay,
    onProgress,
  });

  const total = mediaDuration > 0 ? mediaDuration : duration;

  const progress = useMemo(
    () => (total > 0 ? Math.min(100, (currentTime / total) * 100) : 0),
    [currentTime, total],
  );

  const statusLabel = hasError
    ? 'Indisponível'
    : hasEnded
      ? 'Finalizado'
      : isLoading
        ? 'Carregando'
        : isBuffering
          ? 'Armazenando'
          : isPlaying
            ? 'Reproduzindo'
            : 'Pausado';

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div
      data-testid="mini-player"
      role="button"
      tabIndex={0}
      onClick={onExpand}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onExpand(); } }}
      aria-label={`Mini player: ${title}`}
      style={{
        position: 'fixed',
        right: '24px',
        bottom: '24px',
        width: '340px',
        backgroundColor: '#141A28',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '12px',
        overflow: 'hidden',
        zIndex: 1000,
        boxShadow: '0 18px 40px rgba(0, 0, 0, 0.6), 0 0 24px rgba(0, 0, 0, 0.4)',
        cursor: 'pointer',
      }}
    >
      {/* Área de vídeo 16:9 */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16 / 9',
          backgroundColor: '#070A10',
        }}
      >
        <video
          ref={videoRef}
          src={videoUrl}
          poster={thumbnailUrl}
          playsInline
          preload="metadata"
          data-testid="mini-player-video"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            backgroundColor: '#000000',
          }}
        />

        {/* Botão fechar */}
        <button
          onClick={(e) => { stop(e); onClose(); }}
          aria-label="Fechar mini player"
          title="Fechar"
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            zIndex: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(0, 0, 0, 0.55)',
            color: '#E2E8F0',
            cursor: 'pointer',
          }}
        >
          <X size={15} />
        </button>

        {/* Estado central */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isLoading || isBuffering ? (
            <Spinner size={26} color={accentColor} />
          ) : hasEnded ? (
            <button
              onClick={(e) => { stop(e); replay(); }}
              aria-label="Reproduzir novamente"
              title="Reproduzir novamente"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                border: `1px solid ${accentColor}`,
                background: 'rgba(0, 0, 0, 0.45)',
                color: accentColor,
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={20} />
            </button>
          ) : (
            <button
              onClick={(e) => { stop(e); toggle(); }}
              aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
              title={isPlaying ? 'Pausar' : 'Reproduzir'}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                border: `1px solid ${accentColor}`,
                background: 'rgba(0, 0, 0, 0.45)',
                color: accentColor,
                cursor: 'pointer',
              }}
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: '2px' }} />}
            </button>
          )}
        </div>

        {/* Controles inferiores sobre a mídia */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 10px',
            background: 'linear-gradient(to top, rgba(7, 10, 16, 0.9) 0%, transparent 100%)',
          }}
        >
          <span style={{ fontSize: '11px', color: '#CBD5E1', fontWeight: 500 }}>
            {formatTime(currentTime)} / {formatTime(total)}
          </span>
          <button
            onClick={(e) => { stop(e); skip(-10); }}
            aria-label="Retroceder 10 segundos"
            title="Retroceder 10s"
            style={{ display: 'flex', border: 'none', background: 'transparent', color: '#E2E8F0', cursor: 'pointer' }}
          >
            <RotateCcw size={14} />
          </button>
          <button
            onClick={(e) => { stop(e); onExpand(); }}
            aria-label="Expandir mini player"
            title="Expandir"
            style={{ display: 'flex', border: 'none', background: 'transparent', color: '#E2E8F0', cursor: 'pointer' }}
          >
            <Maximize2 size={14} />
          </button>
        </div>

        {/* Barra de progresso */}
        <div
          data-testid="mini-progress"
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: '3px',
            backgroundColor: 'rgba(255, 255, 255, 0.18)',
          }}
        >
          <div style={{ width: `${progress}%`, height: '100%', backgroundColor: accentColor }} />
        </div>
      </div>

      {/* Informações */}
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: '#F0F4FC',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title}
        </span>
        <span style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
          <span
            style={{
              fontSize: '11px',
              color: '#94A3B8',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {subtitle}
          </span>
          <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: accentColor, flexShrink: 0 }}>
            {statusLabel}
          </span>
        </span>
      </div>
    </div>
  );
};
