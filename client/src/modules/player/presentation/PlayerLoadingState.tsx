import React from 'react';
import { Spinner } from '@/shared/ui/Spinner';

interface PlayerLoadingStateProps {
  label: string;
}

export const PlayerLoadingState: React.FC<PlayerLoadingStateProps> = ({ label }) => (
  <div
    data-testid="player-loading"
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '14px',
      color: '#94A3B8',
    }}
  >
    <Spinner size={38} />
    <span style={{ fontSize: '13px', fontWeight: 500 }}>{label}</span>
  </div>
);
