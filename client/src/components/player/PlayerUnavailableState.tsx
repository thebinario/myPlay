import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface PlayerUnavailableStateProps {
  onReconnect: () => void;
}

export const PlayerUnavailableState: React.FC<PlayerUnavailableStateProps> = ({ onReconnect }) => (
  <div
    data-testid="player-error"
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '12px',
      backgroundColor: 'rgba(20, 26, 40, 0.95)',
      padding: '32px',
      borderRadius: '12px',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      maxWidth: '440px',
      textAlign: 'center',
    }}
  >
    <AlertTriangle size={36} color="#EF4444" />
    <h3 style={{ color: '#F87171', fontSize: '16px', fontWeight: 600 }}>
      Arquivo indisponível ou HD desconectado
    </h3>
    <p style={{ color: '#94A3B8', fontSize: '13px' }}>
      O arquivo da aula não foi localizado no diretório de origem. Verifique se o pendrive ou HD
      externo está conectado.
    </p>
    <button
      onClick={onReconnect}
      aria-label="Tentar reconectar"
      style={{
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
        marginTop: '8px',
      }}
    >
      <RefreshCw size={14} />
      Tentar reconectar
    </button>
  </div>
);
