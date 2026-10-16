import React, { useEffect, useMemo, useState } from 'react';
import { Movie } from '@/core/domain/library';
import {
  ArrowLeft,
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  RotateCw,
  Film,
  Check,
} from 'lucide-react';
import { Spinner } from '@/shared/ui/Spinner';
import { useMediaElementPlayback } from '@/modules/player/presentation/hooks/useMediaElementPlayback';
import { useAutoHideControls } from '@/modules/player/presentation/hooks/useAutoHideControls';

interface MoviePlayerViewProps {
  movie: Movie;
  onBack: () => void;
  /** Tempo de inatividade antes de ocultar os controles durante a reprodução (ms). */
  controlsAutoHideDelayMs?: number;
  /** Posição de retomada (sobrepõe o progresso do filme), em segundos. */
  resumeTime?: number;
  /** Inicia a reprodução automaticamente ao carregar (usado ao restaurar o mini player). */
  autoPlay?: boolean;
  /** Reporta o estado de reprodução atual (usado pelo mini player). */
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

export const MoviePlayerView: React.FC<MoviePlayerViewProps> = ({
  movie,
  onBack,
  controlsAutoHideDelayMs,
  resumeTime,
  autoPlay,
  onProgress,
}) => {
  const fallbackDuration = movie.duration || 0;
  const initialTime = useMemo(
    () => resumeTime ?? Math.floor((movie.progress / 100) * fallbackDuration),
    [movie.progress, fallbackDuration, resumeTime],
  );

  const videoRef = React.useRef<HTMLVideoElement>(null);
  const {
    status,
    isPlaying,
    currentTime,
    duration,
    isLoading,
    isBuffering,
    isSeeking,
    hasEnded,
    toggle,
    replay,
    seek,
    skip,
  } = useMediaElementPlayback({
    videoRef,
    src: movie.videoUrl,
    fallbackDuration: fallbackDuration > initialTime ? fallbackDuration : initialTime,
    initialTime,
    autoPlay,
    onProgress,
  });

  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = volume;
  }, [volume]);
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = isMuted;
  }, [isMuted]);

  const controlsLocked = !isPlaying || hasEnded || isLoading || isBuffering || isSeeking;
  const { areControlsVisible, showControls } = useAutoHideControls({
    isPlaying,
    keepVisible: controlsLocked,
    autoHideDelayMs: controlsAutoHideDelayMs,
  });
  const controlsVisibilityStyle: React.CSSProperties = {
    opacity: areControlsVisible ? 1 : 0,
    transition: 'opacity 0.25s ease',
    pointerEvents: areControlsVisible ? 'auto' : 'none',
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = (e.clientX - rect.left) / rect.width;
    seek(ratio * duration);
  };

  const handleTimelineKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      skip(10);
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      skip(-10);
    }
  };

  return (
    <div
      data-status={status}
      onMouseMove={showControls}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#000000',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top Bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 30,
          padding: '16px 24px',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, transparent 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
        }}
      >
        <button
          onClick={onBack}
          aria-label="Voltar"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#E2E8F0',
            borderRadius: '8px',
            padding: '7px 12px',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={15} />
          Voltar
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Film size={16} color="#10B981" />
          <span style={{ color: '#F0F4FC', fontSize: '14px', fontWeight: 600 }}>{movie.title}</span>
        </div>
        <span
          data-testid="movie-status"
          style={{
            fontSize: '10px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: hasEnded ? '#10B981' : isPlaying ? '#A594FF' : '#94A3B8',
          }}
        >
          {hasEnded
            ? 'Finalizado'
            : isLoading
              ? 'Carregando'
              : isBuffering
                ? 'Armazenando'
                : isSeeking
                  ? 'Buscando'
                  : isPlaying
                    ? 'Reproduzindo'
                    : 'Pausado'}
        </span>
      </div>

      {/* Video Placeholder */}
      <div
        style={{
          flex: 1,
          backgroundColor: '#0A0A0A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          cursor: isLoading || hasEnded ? 'default' : 'pointer',
        }}
        onClick={() => {
          if (!isLoading && !hasEnded) toggle();
        }}
        data-testid="movie-player-canvas"
      >
        <video
          ref={videoRef}
          src={movie.videoUrl}
          poster={movie.coverUrl}
          playsInline
          preload="metadata"
          data-testid="movie-video"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            backgroundColor: '#000000',
          }}
        />

        {isLoading ? (
          <div
            data-testid="movie-loading"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              color: '#94A3B8',
              zIndex: 2,
            }}
          >
            <Spinner size={36} color="#10B981" />
            <span style={{ fontSize: '13px' }}>Carregando filme...</span>
          </div>
        ) : hasEnded ? (
          <div
            data-testid="movie-ended"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              zIndex: 2,
              textAlign: 'center',
            }}
          >
            <Check size={34} color="#10B981" />
            <h3 style={{ color: '#F0F4FC', fontSize: '16px', fontWeight: 600, margin: 0 }}>
              Fim do filme
            </h3>
            <button
              onClick={(e) => {
                e.stopPropagation();
                replay();
              }}
              aria-label="Reproduzir novamente"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#10B981',
                color: '#04110C',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={14} />
              Reproduzir novamente
            </button>
          </div>
        ) : (
          <>
            <div
              style={{
                ...controlsVisibilityStyle,
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255,255,255,0.12)',
                border: '2px solid rgba(255,255,255,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                zIndex: 2,
                backdropFilter: 'blur(8px)',
              }}
            >
              {isBuffering ? (
                <Spinner size={30} color="#FFFFFF" />
              ) : isPlaying ? (
                <Pause size={30} color="#FFFFFF" />
              ) : (
                <Play size={30} color="#FFFFFF" style={{ marginLeft: '3px' }} />
              )}
            </div>

            {isBuffering && (
              <div
                data-testid="movie-buffering"
                style={{
                  position: 'absolute',
                  bottom: '24px',
                  zIndex: 3,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  borderRadius: '999px',
                  padding: '5px 12px',
                  fontSize: '11px',
                  color: '#E2E8F0',
                }}
              >
                Armazenando em buffer...
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Controls */}
      <div
        data-testid="movie-controls"
        style={{
          ...controlsVisibilityStyle,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 30,
          padding: '12px 24px 20px',
          background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)',
        }}
      >
        {/* Timeline */}
        <div
          role="slider"
          aria-label="Linha do tempo"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(currentTime)}
          tabIndex={0}
          data-testid="movie-timeline"
          onClick={handleTimelineClick}
          onKeyDown={handleTimelineKeyDown}
          style={{
            width: '100%',
            height: '4px',
            backgroundColor: 'rgba(255,255,255,0.15)',
            borderRadius: '999px',
            overflow: 'hidden',
            marginBottom: '14px',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              backgroundColor: '#10B981',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              aria-label="Retroceder 10s"
              onClick={() => skip(-10)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                display: 'flex',
              }}
            >
              <RotateCcw size={20} />
            </button>

            <button
              aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
              onClick={toggle}
              style={{
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
              }}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: '2px' }} />}
            </button>

            <button
              aria-label="Avançar 10s"
              onClick={() => skip(10)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                display: 'flex',
              }}
            >
              <RotateCw size={20} />
            </button>

            <span style={{ color: '#94A3B8', fontSize: '12px', fontWeight: 500 }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              aria-label={isMuted ? 'Desativar mudo' : 'Ativar mudo'}
              onClick={() => setIsMuted((m) => !m)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                display: 'flex',
              }}
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(parseFloat(e.target.value));
                setIsMuted(false);
              }}
              aria-label="Volume"
              style={{ width: '80px', accentColor: '#10B981' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
