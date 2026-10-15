import React from 'react';
import type { PdfColorMode, PdfPageChunk } from '../../types/library';
import { PdfUnavailableState } from './PdfUnavailableState';
import { PdfTextPage } from './PdfTextPage';

interface PdfPageViewportProps {
  title: string;
  currentPage: number;
  totalPages: number;
  zoom: number;
  colorMode: PdfColorMode;
  isUnavailable: boolean;
  isLoading: boolean;
  hasRenderedPdf: boolean;
  currentChunk: PdfPageChunk | undefined;
  containerRef: React.RefObject<HTMLDivElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onScroll: (event: React.UIEvent<HTMLDivElement>) => void;
  onReconnect: () => void;
}

export const PdfPageViewport: React.FC<PdfPageViewportProps> = ({
  title,
  currentPage,
  totalPages,
  zoom,
  colorMode,
  isUnavailable,
  isLoading,
  hasRenderedPdf,
  currentChunk,
  containerRef,
  canvasRef,
  onScroll,
  onReconnect,
}) => (
  <div
    ref={containerRef}
    onScroll={onScroll}
    style={{
      flex: 1,
      overflowY: 'auto',
      overflowX: 'auto',
      padding: '36px 20px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      backgroundColor: '#0A0D15',
    }}
  >
    {isUnavailable ? (
      <PdfUnavailableState onReconnect={onReconnect} />
    ) : (
      <div
        data-testid="pdf-page-canvas"
        data-color-mode={colorMode}
        style={{
          width: `${Math.round(720 * zoom)}px`,
          minHeight: `${Math.round(1020 * zoom)}px`,
          backgroundColor: colorMode === 'dark' ? '#141A28' : '#FFFFFF',
          color: colorMode === 'dark' ? '#E2E8F0' : '#1E293B',
          boxShadow:
            colorMode === 'dark'
              ? '0 12px 40px rgba(0, 0, 0, 0.8), 0 0 20px rgba(165, 148, 255, 0.05)'
              : '0 12px 40px rgba(0, 0, 0, 0.3)',
          borderRadius: '10px',
          border:
            colorMode === 'dark' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #CBD5E1',
          padding: `${Math.round(48 * zoom)}px`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          transition:
            'background-color 0.2s ease, color 0.2s ease, width 0.15s ease, min-height 0.15s ease',
        }}
      >
        {hasRenderedPdf ? (
          <canvas
            ref={canvasRef}
            data-testid="pdf-canvas"
            style={{
              display: 'block',
              margin: '0 auto',
              borderRadius: '4px',
              filter: colorMode === 'dark' ? 'invert(1) hue-rotate(180deg)' : 'none',
            }}
          />
        ) : (
          <PdfTextPage
            title={title}
            currentPage={currentPage}
            totalPages={totalPages}
            zoom={zoom}
            colorMode={colorMode}
            isLoading={isLoading}
            content={currentChunk}
          />
        )}
      </div>
    )}
  </div>
);
