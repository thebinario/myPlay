import React, { useState, useEffect, useRef } from 'react';
import { Movie } from '../../types/library';
import {
  ArrowLeft,
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  RotateCw,
  Film,
} from 'lucide-react';

interface MoviePlayerViewProps {
  movie: Movie;
  onBack: () => void;
}

function formatTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const MoviePlayerView: React.FC<MoviePlayerViewProps> = ({ movie, onBack }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(
    Math.floor((movie.progress / 100) * movie.duration),
  );
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Simulação de progresso
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= movie.duration) {
            setIsPlaying(false);
            return movie.duration;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, movie.duration]);

  const progress = movie.duration > 0 ? (currentTime / movie.duration) * 100 : 0;

  return (
    <div
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
          <span style={{ color: '#F0F4FC', fontSize: '14px', fontWeight: 600 }}>
            {movie.title}
          </span>
        </div>
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
          cursor: 'pointer',
        }}
        onClick={() => setIsPlaying(p => !p)}
        data-testid="movie-player-canvas"
      >
        {/* Cover image as placeholder */}
        <img
          src={movie.coverUrl}
          alt={movie.title}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.3,
          }}
        />
        <div
          style={{
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
          {isPlaying ? (
            <Pause size={30} color="#FFFFFF" />
          ) : (
            <Play size={30} color="#FFFFFF" style={{ marginLeft: '3px' }} />
          )}
        </div>
      </div>

      {/* Bottom Controls */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 30,
          padding: '12px 24px 20px',
          background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)',
        }}
      >
        {/* Progress bar */}
        <div
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
              onClick={() => setCurrentTime(t => Math.max(0, t - 10))}
              style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', display: 'flex' }}
            >
              <RotateCcw size={20} />
            </button>

            <button
              aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
              onClick={() => setIsPlaying(p => !p)}
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
              onClick={() => setCurrentTime(t => Math.min(movie.duration, t + 10))}
              style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', display: 'flex' }}
            >
              <RotateCw size={20} />
            </button>

            <span style={{ color: '#94A3B8', fontSize: '12px', fontWeight: 500 }}>
              {formatTime(currentTime)} / {formatTime(movie.duration)}
            </span>
          </div>

          {/* Volume */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              aria-label={isMuted ? 'Desativar mudo' : 'Ativar mudo'}
              onClick={() => setIsMuted(m => !m)}
              style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', display: 'flex' }}
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={e => { setVolume(parseFloat(e.target.value)); setIsMuted(false); }}
              aria-label="Volume"
              style={{ width: '80px', accentColor: '#10B981' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
