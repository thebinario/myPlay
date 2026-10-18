import React from 'react';
import { AlertTriangle, FileX, FileWarning, RefreshCw } from 'lucide-react';
import type { PlaybackErrorInfo } from '@/modules/player/domain/playback-error';

export interface PlayerUnavailableStateProps {
  errorInfo?: PlaybackErrorInfo | null;
  onReconnect: () => void;
}

export const PlayerUnavailableState: React.FC<PlayerUnavailableStateProps> = ({
  errorInfo,
  onReconnect,
}) => {
  const isUnsupported = errorInfo?.kind === 'unsupported_format';
  const isCorrupted = errorInfo?.kind === 'corrupted';

  const title =
    errorInfo?.title ?? 'Arquivo indisponível ou HD desconectado';

  const message =
    errorInfo?.message ??
    'O arquivo da aula não foi localizado no diretório de origem. Verifique se o pendrive ou HD externo está conectado.';

  const suggestion = errorInfo?.suggestion;
  const format = errorInfo?.format && errorInfo.format !== 'DESCONHECIDO' ? errorInfo.format : null;

  return (
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
        maxWidth: '460px',
        textAlign: 'center',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.5)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {isUnsupported ? (
          <FileX size={40} color="#F87171" />
        ) : isCorrupted ? (
          <FileWarning size={40} color="#F87171" />
        ) : (
          <AlertTriangle size={40} color="#EF4444" />
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <h3 style={{ color: '#F87171', fontSize: '16px', fontWeight: 600, margin: 0 }}>
          {title}
        </h3>
        {format && (
          <span
            style={{
              display: 'inline-block',
              backgroundColor: isUnsupported ? 'rgba(239, 68, 68, 0.2)' : 'rgba(165, 148, 255, 0.15)',
              color: isUnsupported ? '#FCA5A5' : '#C4B5FD',
              border: `1px solid ${isUnsupported ? 'rgba(239, 68, 68, 0.4)' : 'rgba(165, 148, 255, 0.3)'}`,
              borderRadius: '4px',
              padding: '2px 8px',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.5px',
            }}
          >
            {format}
          </span>
        )}
      </div>

      <p style={{ color: '#94A3B8', fontSize: '13px', margin: 0, lineHeight: 1.5 }}>
        {message}
      </p>

      {suggestion && (
        <p
          style={{
            color: '#64748B',
            fontSize: '12px',
            margin: '4px 0 0',
            lineHeight: 1.4,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          {suggestion}
        </p>
      )}

      <button
        onClick={onReconnect}
        aria-label={isUnsupported || isCorrupted ? 'Tentar novamente' : 'Tentar reconectar'}
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
          transition: 'background-color 0.2s ease',
        }}
      >
        <RefreshCw size={14} />
        {isUnsupported || isCorrupted ? 'Tentar novamente' : 'Tentar reconectar'}
      </button>
    </div>
  );
};
