import React from 'react';
import { Check, RotateCcw, SkipForward } from 'lucide-react';

interface PlayerEndedStateProps {
  isLastLesson: boolean;
  onReplay: () => void;
  onNextLesson: () => void;
}

const endedButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  backgroundColor: '#A594FF',
  color: '#0D111B',
  border: 'none',
  borderRadius: '8px',
  padding: '8px 16px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
};

export const PlayerEndedState: React.FC<PlayerEndedStateProps> = ({
  isLastLesson,
  onReplay,
  onNextLesson,
}) => (
  <div
    data-testid="player-ended"
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '12px',
      textAlign: 'center',
    }}
  >
    <Check size={36} color="#10B981" />
    <h3 style={{ color: '#F0F4FC', fontSize: '16px', fontWeight: 600 }}>Aula concluída</h3>
    <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
      <button onClick={onReplay} aria-label="Reproduzir novamente" style={endedButtonStyle}>
        <RotateCcw size={14} />
        Reproduzir novamente
      </button>
      {!isLastLesson && (
        <button
          onClick={onNextLesson}
          aria-label="Ir para a próxima aula"
          style={{
            ...endedButtonStyle,
            backgroundColor: 'transparent',
            color: '#E2E8F0',
            border: '1px solid rgba(255,255,255,0.15)',
          }}
        >
          Próxima aula
          <SkipForward size={14} />
        </button>
      )}
    </div>
  </div>
);
