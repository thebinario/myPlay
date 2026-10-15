import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface PdfUnavailableStateProps {
  onReconnect: () => void;
}

export const PdfUnavailableState: React.FC<PdfUnavailableStateProps> = ({ onReconnect }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '12px',
      backgroundColor: '#141A28',
      padding: '36px',
      borderRadius: '12px',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      maxWidth: '460px',
      textAlign: 'center',
      marginTop: '40px',
    }}
  >
    <AlertTriangle size={36} color="#EF4444" />
    <h3 style={{ color: '#F87171', fontSize: '16px', fontWeight: 600 }}>
      Documento indisponível ou HD desconectado
    </h3>
    <p style={{ color: '#94A3B8', fontSize: '13px', lineHeight: '1.5' }}>
      Não foi possível carregar o arquivo PDF no caminho indicado. Verifique se o pendrive ou HD
      externo está devidamente montado.
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
        marginTop: '6px',
      }}
    >
      <RefreshCw size={14} />
      Tentar reconectar
    </button>
  </div>
);
