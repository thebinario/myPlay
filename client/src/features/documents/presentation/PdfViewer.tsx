import React from 'react';
import type { Document } from '@/core/domain/library';
import { usePdfReader } from '@/features/documents/application/usePdfReader';
import { PdfToolbar } from '@/features/documents/presentation/PdfToolbar';
import { PdfPageViewport } from '@/features/documents/presentation/PdfPageViewport';

interface PdfViewerProps {
  document: Document;
  onBack: () => void;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ document, onBack }) => {
  const reader = usePdfReader(document);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        backgroundColor: '#0D111B',
        overflow: 'hidden',
      }}
    >
      <PdfToolbar
        title={document.title}
        currentPage={reader.currentPage}
        totalPages={reader.totalPages}
        zoom={reader.zoom}
        colorMode={reader.colorMode}
        isUnavailable={reader.isUnavailable}
        onBack={onBack}
        onPrevPage={reader.handlePrevPage}
        onNextPage={reader.handleNextPage}
        onZoomIn={reader.handleZoomIn}
        onZoomOut={reader.handleZoomOut}
        onToggleColorMode={reader.handleToggleColorMode}
      />

      <PdfPageViewport
        title={document.title}
        currentPage={reader.currentPage}
        totalPages={reader.totalPages}
        zoom={reader.zoom}
        colorMode={reader.colorMode}
        isUnavailable={reader.isUnavailable}
        isLoading={reader.isLoading}
        hasRenderedPdf={reader.hasRenderedPdf}
        currentChunk={reader.currentChunk}
        containerRef={reader.containerRef}
        canvasRef={reader.canvasRef}
        onScroll={reader.handleScroll}
        onReconnect={reader.handleReconnect}
      />
    </div>
  );
};
