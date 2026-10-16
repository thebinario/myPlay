import React from 'react';
import {
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
  Subtitles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { IconButton } from '@/shared/ui/components/IconButton';
import { PlayerTimeline } from '@/modules/player/presentation/components/PlayerTimeline';

interface PlaybackControlsProps {
  controlsVisibilityStyle: React.CSSProperties;
  currentTime: number;
  duration: number;
  playbackRate: number;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  isFullscreen: boolean;
  selectedSubtitleId: string | null;
  isFirstLesson: boolean;
  isLastLesson: boolean;
  formatSeconds: (seconds: number) => string;
  onTogglePlay: () => void;
  onRewind: () => void;
  onForward: () => void;
  onPrevLesson: () => void;
  onNextLesson: () => void;
  onTimelineClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  onTimelineKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  onToggleSubtitleMenu: () => void;
  onToggleSpeedMenu: () => void;
  onToggleFullscreen: () => void;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  controlsVisibilityStyle,
  currentTime,
  duration,
  playbackRate,
  isPlaying,
  isMuted,
  volume,
  isFullscreen,
  selectedSubtitleId,
  isFirstLesson,
  isLastLesson,
  formatSeconds,
  onTogglePlay,
  onRewind,
  onForward,
  onPrevLesson,
  onNextLesson,
  onTimelineClick,
  onTimelineKeyDown,
  onVolumeChange,
  onToggleMute,
  onToggleSubtitleMenu,
  onToggleSpeedMenu,
  onToggleFullscreen,
}) => (
  <div
    data-testid="player-controls"
    style={{
      ...controlsVisibilityStyle,
      position: 'relative',
      zIndex: 2,
      background:
        'linear-gradient(to top, rgba(7, 10, 16, 0.95) 0%, rgba(7, 10, 16, 0.4) 70%, transparent 100%)',
      padding: '16px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
    }}
  >
    <PlayerTimeline
      currentTime={currentTime}
      duration={duration}
      onClick={onTimelineClick}
      onKeyDown={onTimelineKeyDown}
    />

    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <IconButton
          icon={SkipBack}
          onClick={onPrevLesson}
          disabled={isFirstLesson}
          aria-label="Aula anterior"
          variant={isFirstLesson ? 'muted' : 'default'}
        >
          <SkipBack size={18} />
        </IconButton>

        <IconButton
          icon={RotateCcw}
          onClick={onRewind}
          aria-label="Retroceder 10 segundos"
          title="Retroceder 10s"
          variant="default"
        >
          <RotateCcw size={18} />
        </IconButton>

        <IconButton
          icon={isPlaying ? Pause : Play}
          onClick={onTogglePlay}
          aria-label={isPlaying ? 'Pausar vídeo' : 'Reproduzir vídeo'}
          title={isPlaying ? 'Pausar' : 'Reproduzir'}
          variant="violet"
        >
          {isPlaying ? (
            <Pause size={18} fill="#0D111B" />
          ) : (
            <Play size={18} fill="#0D111B" style={{ marginLeft: '2px' }} />
          )}
        </IconButton>

        <IconButton
          icon={RotateCw}
          onClick={onForward}
          aria-label="Avançar 10 segundos"
          title="Avançar 10s"
          variant="default"
        >
          <RotateCw size={18} />
        </IconButton>

        <IconButton
          icon={SkipForward}
          onClick={onNextLesson}
          disabled={isLastLesson}
          aria-label="Próxima aula"
          variant={isLastLesson ? 'muted' : 'default'}
        >
          <SkipForward size={18} />
        </IconButton>

        <div style={{ marginLeft: '8px', fontSize: '13px', color: '#94A3B8' }}>
          <span data-testid="current-time" style={{ color: '#F0F4FC', fontWeight: 600 }}>
            {formatSeconds(currentTime)}
          </span>{' '}
          <span>{formatSeconds(duration)}</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <IconButton
            icon={isMuted ? VolumeX : Volume2}
            onClick={onToggleMute}
            aria-label={isMuted ? 'Desmutar' : 'Mutar'}
            variant="muted"
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </IconButton>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            aria-label="Controle de volume"
            style={{ width: '60px', height: '4px', accentColor: '#A594FF', cursor: 'pointer' }}
          />
        </div>

        <IconButton
          icon={Subtitles}
          onClick={onToggleSubtitleMenu}
          aria-label="Legendas e idiomas (CC)"
          title="Legendas (CC)"
          variant={selectedSubtitleId ? 'violet' : 'muted'}
        >
          <Subtitles size={17} />
          CC
        </IconButton>

        <IconButton
          icon={RotateCcw}
          onClick={onToggleSpeedMenu}
          aria-label={`Velocidade de reprodução: ${playbackRate}x`}
          title="Velocidade"
          variant="muted"
        >
          {playbackRate}x
        </IconButton>

        <IconButton
          icon={isFullscreen ? Minimize : Maximize}
          onClick={onToggleFullscreen}
          aria-label={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
          title="Tela cheia"
          variant="muted"
        >
          {isFullscreen ? <Minimize size={17} /> : <Maximize size={17} />}
        </IconButton>
      </div>
    </div>
  </div>
);
