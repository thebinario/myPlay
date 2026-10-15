import React from 'react';
import { RotateCcw } from 'lucide-react';
import { IconButton } from '../ui/IconButton';

interface SpeedMenuProps {
  playbackRate: number;
  onSelect: (rate: number) => void;
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export const SpeedMenu: React.FC<SpeedMenuProps> = ({ playbackRate, onSelect }) => (
  <div
    data-testid="speed-floating-menu"
    style={{
      position: 'absolute',
      bottom: '72px',
      right: '60px',
      width: '120px',
      backgroundColor: '#141A28',
      border: '1px solid rgba(165, 148, 255, 0.3)',
      borderRadius: '10px',
      padding: '6px',
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
      gap: '2px',
    }}
  >
    {SPEEDS.map((speed) => (
      <IconButton
        icon={RotateCcw}
        key={speed}
        onClick={() => onSelect(speed)}
        variant={playbackRate === speed ? 'violet' : 'muted'}
      >
        {speed}x
      </IconButton>
    ))}
  </div>
);
