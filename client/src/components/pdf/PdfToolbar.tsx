import React from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Sun,
  Moon,
  FileText,
} from 'lucide-react';
import type { PdfColorMode } from '../../types/library';

interface PdfToolbarProps {
  title: string;
  currentPage: number;
  totalPages: number;
  zoom: number;
  colorMode: PdfColorMode;
  isUnavailable: boolean;
  onBack: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleColorMode: () => void;
}

export const PdfToolbar: React.FC<PdfToolbarProps> = ({
  title,
  currentPage,
  totalPages,
  zoom,
  colorMode,
  isUnavailable,
  onBack,
  onPrevPage,
  onNextPage,
  onZoomIn,
  onZoomOut,
  onToggleColorMode,
}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 24px',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      backgroundColor: '#121622',
      flexWrap: 'wrap',
      gap: '12px',
      zIndex: 40,
    }}
  >
    {/* Left: Back button & Title */}
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
      <button
        onClick={onBack}
        aria-label="Voltar da leitura"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: 'transparent',
          border: 'none',
          color: '#94A3B8',
          fontSize: '13px',
          fontWeight: 500,
          cursor: 'pointer',
          padding: '6px 10px',
          borderRadius: '6px',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#A594FF';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#94A3B8';
        }}
      >
        <ArrowLeft size={16} />
        Voltar
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <FileText size={18} color="#A594FF" />
        <span
          style={{
            color: '#F0F4FC',
            fontSize: '14px',
            fontWeight: 600,
            maxWidth: '380px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={title}
        >
          {title}
        </span>
      </div>
    </div>

    {/* Center: Pagination controls */}
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        backgroundColor: '#1A2234',
        padding: '4px 10px',
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      <button
        onClick={onPrevPage}
        disabled={currentPage <= 1 || isUnavailable}
        aria-label="Página anterior"
        title="Página anterior"
        style={{
          background: 'transparent',
          border: 'none',
          color: currentPage <= 1 ? '#475569' : '#E2E8F0',
          cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          padding: '2px',
        }}
      >
        <ChevronLeft size={18} />
      </button>

      <span style={{ fontSize: '12px', color: '#E2E8F0', fontWeight: 600 }}>
        Página <span data-testid="pdf-current-page">{currentPage}</span> de {totalPages}
      </span>

      <button
        onClick={onNextPage}
        disabled={currentPage >= totalPages || isUnavailable}
        aria-label="Próxima página"
        title="Próxima página"
        style={{
          background: 'transparent',
          border: 'none',
          color: currentPage >= totalPages ? '#475569' : '#E2E8F0',
          cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          padding: '2px',
        }}
      >
        <ChevronRight size={18} />
      </button>
    </div>

    {/* Right: Zoom controls & Color Mode toggle */}
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: '#1A2234',
          padding: '4px 8px',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <button
          onClick={onZoomOut}
          disabled={isUnavailable}
          aria-label="Diminuir zoom"
          title="Diminuir zoom (-25%)"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94A3B8',
            cursor: 'pointer',
            padding: '2px',
          }}
        >
          <ZoomOut size={16} />
        </button>

        <span
          data-testid="pdf-zoom-level"
          style={{
            fontSize: '11px',
            color: '#A594FF',
            fontWeight: 700,
            minWidth: '38px',
            textAlign: 'center',
          }}
        >
          {Math.round(zoom * 100)}%
        </span>

        <button
          onClick={onZoomIn}
          disabled={isUnavailable}
          aria-label="Aumentar zoom"
          title="Aumentar zoom (+25%)"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94A3B8',
            cursor: 'pointer',
            padding: '2px',
          }}
        >
          <ZoomIn size={16} />
        </button>
      </div>

      <button
        onClick={onToggleColorMode}
        disabled={isUnavailable}
        aria-label={`Alternar modo de cor (atualmente: ${colorMode === 'dark' ? 'Modo Escuro' : 'Cores Originais'})`}
        title={colorMode === 'dark' ? 'Mudar para Cores Originais' : 'Mudar para Modo Escuro'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor:
            colorMode === 'dark' ? 'rgba(165, 148, 255, 0.15)' : 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: colorMode === 'dark' ? '#A594FF' : '#F0F4FC',
          borderRadius: '8px',
          padding: '6px 12px',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        {colorMode === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
        <span>{colorMode === 'dark' ? 'Modo Escuro' : 'Cores Originais'}</span>
      </button>
    </div>
  </div>
);
