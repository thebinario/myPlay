import React from 'react';
import { ProgressBar } from '@/shared/ui/ProgressBar';

interface PlayerTimelineProps {
  currentTime: number;
  duration: number;
  onClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
}

export const PlayerTimeline: React.FC<PlayerTimelineProps> = ({
  currentTime,
  duration,
  onClick,
  onKeyDown,
}) => (
  <div
    role="slider"
    aria-label="Linha do tempo"
    aria-valuemin={0}
    aria-valuemax={Math.round(duration)}
    aria-valuenow={Math.round(currentTime)}
    tabIndex={0}
    data-testid="player-timeline"
    onClick={onClick}
    onKeyDown={onKeyDown}
    style={{ cursor: 'pointer', padding: '6px 0' }}
  >
    <ProgressBar
      value={currentTime}
      max={duration}
      width="100%"
      height="6px"
      bgColor="rgba(255, 255, 255, 0.15)"
      progressColor="#A594FF"
    />
  </div>
);
