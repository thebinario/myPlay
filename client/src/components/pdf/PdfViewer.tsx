import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Document, PdfColorMode, PdfPageChunk } from '../../types/library';
import { 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Sun, 
  Moon, 
  AlertTriangle, 
  RefreshCw, 
  BookOpen, 
  FileText 
} from 'lucide-react';
import { mockLibraryService } from '../../services/mockData';

interface PdfViewerProps {
  document: Document;
  onBack: () => void;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ document, onBack }) => {
  // Recupera estado salvo anteriormente ou padrão
  const initialReadingState = mockLibraryService.getDocumentReadingState(document.id);

  const [currentPage, setCurrentPage] = useState<number>(initialReadingState.currentPage || 1);
  const [zoom, setZoom] = useState<number>(initialReadingState.zoom || 1);
  const [colorMode, setColorMode] = useState<PdfColorMode>(initialReadingState.colorMode || 'dark');
  const [relativeScrollPosition, setRelativeScrollPosition] = useState<number>(initialReadingState.relativeScrollPosition || 0);

  // Estado de carregamento parcial (chunk streaming preparado)
  const [loadedChunks, setLoadedChunks] = useState<Record<number, PdfPageChunk>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUnavailable, setIsUnavailable] = useState<boolean>(!!document.isUnavailable);

  const containerRef = useRef<HTMLDivElement>(null);

  // Persiste estado de leitura a cada alteração
  const persistState = useCallback((page: number, currentZoom: number, mode: PdfColorMode, scroll: number) => {
    mockLibraryService.saveDocumentReadingState(document.id, {
      currentPage: page,
      zoom: currentZoom,
      colorMode: mode,
      relativeScrollPosition: scroll,
    });
  }, [document.id]);

  useEffect(() => {
    persistState(currentPage, zoom, colorMode, relativeScrollPosition);
  }, [currentPage, zoom, colorMode, relativeScrollPosition, persistState]);

  // Carregamento parcial de páginas em janela curta em torno da página atual
  const loadPageRange = useCallback(async (page: number) => {
    try {
      setIsLoading(true);
      // Solicita uma janela curta de páginas (ex: página anterior, atual e próxima)
      const startPage = Math.max(1, page - 1);
      const endPage = Math.min(document.totalPages, page + 1);

      const chunks = await mockLibraryService.fetchPageRange(document.id, startPage, endPage);
      
      setLoadedChunks(prev => {
        const next = { ...prev };
        chunks.forEach(chunk => {
          next[chunk.pageNumber] = chunk;
        });
        return next;
      });
      setIsUnavailable(false);
    } catch (error) {
      console.warn('Erro ao carregar intervalo de páginas do PDF:', error);
      setIsUnavailable(true);
    } finally {
      setIsLoading(false);
    }
  }, [document.id, document.totalPages]);

  useEffect(() => {
    loadPageRange(currentPage);
  }, [currentPage, loadPageRange]);

  const handleNextPage = () => {
    if (currentPage < document.totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(2.0, Math.round((prev + 0.25) * 100) / 100));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(0.75, Math.round((prev - 0.25) * 100) / 100));
  };

  const handleToggleColorMode = () => {
    setColorMode(prev => (prev === 'dark' ? 'original' : 'dark'));
  };

  const handleReconnect = () => {
    mockLibraryService.setDocumentUnavailable(document.id, false);
    setIsUnavailable(false);
    loadPageRange(currentPage);
  };

  const currentChunk = loadedChunks[currentPage];

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
      {/* Top Compact Control Bar */}
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
            onMouseEnter={(e) => { e.currentTarget.style.color = '#A594FF'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#94A3B8'; }}
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
              title={document.title}
            >
              {document.title}
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
            onClick={handlePrevPage}
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
            Página <span data-testid="pdf-current-page">{currentPage}</span> de {document.totalPages}
          </span>

          <button
            onClick={handleNextPage}
            disabled={currentPage >= document.totalPages || isUnavailable}
            aria-label="Próxima página"
            title="Próxima página"
            style={{
              background: 'transparent',
              border: 'none',
              color: currentPage >= document.totalPages ? '#475569' : '#E2E8F0',
              cursor: currentPage >= document.totalPages ? 'not-allowed' : 'pointer',
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
          {/* Zoom controls */}
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
              onClick={handleZoomOut}
              disabled={isUnavailable}
              aria-label="Diminuir zoom"
              title="Diminuir zoom (-25%)"
              style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '2px' }}
            >
              <ZoomOut size={16} />
            </button>

            <span 
              data-testid="pdf-zoom-level" 
              style={{ fontSize: '11px', color: '#A594FF', fontWeight: 700, minWidth: '38px', textAlign: 'center' }}
            >
              {Math.round(zoom * 100)}%
            </span>

            <button
              onClick={handleZoomIn}
              disabled={isUnavailable}
              aria-label="Aumentar zoom"
              title="Aumentar zoom (+25%)"
              style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '2px' }}
            >
              <ZoomIn size={16} />
            </button>
          </div>

          {/* Color Mode Toggle (Modo Escuro / Cores Originais) */}
          <button
            onClick={handleToggleColorMode}
            disabled={isUnavailable}
            aria-label={`Alternar modo de cor (atualmente: ${colorMode === 'dark' ? 'Modo Escuro' : 'Cores Originais'})`}
            title={colorMode === 'dark' ? 'Mudar para Cores Originais' : 'Mudar para Modo Escuro'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: colorMode === 'dark' ? 'rgba(165, 148, 255, 0.15)' : 'rgba(255, 255, 255, 0.1)',
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

      {/* Main Document Reading Canvas Area */}
      <div 
        ref={containerRef}
        onScroll={(e) => {
          const target = e.currentTarget;
          const maxScroll = target.scrollHeight - target.clientHeight;
          if (maxScroll > 0) {
            setRelativeScrollPosition(target.scrollTop / maxScroll);
          }
        }}
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
              Não foi possível carregar o arquivo PDF no caminho indicado. Verifique se o pendrive ou HD externo está devidamente montado.
            </p>
            <button
              onClick={handleReconnect}
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
        ) : (
          <div
            data-testid="pdf-page-canvas"
            data-color-mode={colorMode}
            style={{
              width: `${Math.round(720 * zoom)}px`,
              minHeight: `${Math.round(1020 * zoom)}px`,
              backgroundColor: colorMode === 'dark' ? '#141A28' : '#FFFFFF',
              color: colorMode === 'dark' ? '#E2E8F0' : '#1E293B',
              boxShadow: colorMode === 'dark' 
                ? '0 12px 40px rgba(0, 0, 0, 0.8), 0 0 20px rgba(165, 148, 255, 0.05)'
                : '0 12px 40px rgba(0, 0, 0, 0.3)',
              borderRadius: '10px',
              border: colorMode === 'dark' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #CBD5E1',
              padding: `${Math.round(48 * zoom)}px`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'background-color 0.2s ease, color 0.2s ease, width 0.15s ease, min-height 0.15s ease',
            }}
          >
            {/* Page Header Header Meta */}
            <div 
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderBottom: colorMode === 'dark' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
                paddingBottom: '12px',
                marginBottom: '28px',
                fontSize: `${Math.round(11 * zoom)}px`,
                color: colorMode === 'dark' ? '#8B949E' : '#64748B',
              }}
            >
              <span>{document.title}</span>
              <span>Capítulo {Math.ceil(currentPage / 10)}</span>
            </div>

            {/* Page Main Content Body */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h2 
                style={{
                  fontSize: `${Math.round(20 * zoom)}px`,
                  fontWeight: 700,
                  color: colorMode === 'dark' ? '#FFFFFF' : '#0F172A',
                  letterSpacing: '-0.3px',
                }}
              >
                Página {currentPage}: {document.title.replace('.pdf', '')}
              </h2>

              <p 
                style={{
                  fontSize: `${Math.round(14 * zoom)}px`,
                  lineHeight: '1.7',
                  color: colorMode === 'dark' ? '#CBD5E1' : '#334155',
                }}
              >
                {currentChunk?.content || (
                  isLoading ? 'Carregando página...' : 'Conteúdo da página estruturado em blocos de texto formatados.'
                )}
              </p>

              <div 
                style={{
                  backgroundColor: colorMode === 'dark' ? '#101520' : '#F8FAFC',
                  border: colorMode === 'dark' ? '1px solid rgba(165, 148, 255, 0.2)' : '1px solid #E2E8F0',
                  borderRadius: '8px',
                  padding: '16px',
                  marginTop: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <BookOpen size={16} color="#A594FF" />
                  <span style={{ fontSize: `${Math.round(12 * zoom)}px`, fontWeight: 600, color: '#A594FF' }}>
                    Nota Arquitetural
                  </span>
                </div>
                <p style={{ fontSize: `${Math.round(12 * zoom)}px`, color: colorMode === 'dark' ? '#94A3B8' : '#64748B', lineHeight: '1.6' }}>
                  A inversão de controle permite que módulos de alto nível não dependam de detalhes de implementação. Em aplicações desktop com Tauri e React, desacoplar os adaptadores de I/O preserva a testabilidade do core da aplicação.
                </p>
              </div>
            </div>

            {/* Page Footer */}
            <div 
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderTop: colorMode === 'dark' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
                paddingTop: '12px',
                marginTop: '32px',
                fontSize: `${Math.round(11 * zoom)}px`,
                color: colorMode === 'dark' ? '#8B949E' : '#64748B',
              }}
            >
              <span>MIDOTECA — Leitura Digital</span>
              <span>Página {currentPage} de {document.totalPages}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
