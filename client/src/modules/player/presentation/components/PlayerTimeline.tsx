import React, { useState } from 'react';
import { clampSeekTime } from '@/modules/player/domain/progress';
import { ProgressBar } from '@/shared/ui/components/ProgressBar';

interface PlayerTimelineProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}

export const PlayerTimeline: React.FC<PlayerTimelineProps> = ({
  currentTime,
  duration,
  onSeek,
}) => {
  const [focused, setFocused] = useState(false);
  const max = duration > 0 ? duration : 1;

  return (
    <div
      data-testid="player-timeline-track"
      style={{
        position: 'relative',
        height: '18px',
        padding: '6px 0',
        borderRadius: '999px',
        outline: focused ? '2px solid #A594FF' : 'none',
        outlineOffset: '3px',
      }}
    >
      <div style={{ position: 'absolute', inset: '6px 0' }} aria-hidden="true">
        <ProgressBar
          value={currentTime}
          max={max}
          width="100%"
          height="6px"
          bgColor="rgba(255, 255, 255, 0.15)"
          progressColor="#A594FF"
        />
      </div>
      <input
        type="range"
        role="slider"
        aria-label="Linha do tempo"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(currentTime)}
        min={0}
        max={max}
        step={0.1}
        value={clampSeekTime(currentTime, duration)}
        onChange={(event) => onSeek(Number(event.currentTarget.value))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          margin: 0,
          opacity: 0.01,
          cursor: 'pointer',
          touchAction: 'none',
        }}
      />
    </div>
  );
};
