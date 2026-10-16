import { useCallback, useEffect, useRef, useState } from 'react';
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { Document, PdfColorMode, PdfPageChunk } from '@/core/domain/library';
import { useLibraryRepository } from '@/modules/library/presentation/LibraryProvider';
import {
  normalizeReadingState,
  fitPageScale,
  nextPage,
  pageRange,
  previousPage,
  scrollRatio,
  toggleColorMode,
  zoomIn,
  zoomOut,
} from '@/modules/documents/domain/pdf-reading';

/** jsdom não implementa canvas/2D; o PDF real é renderizado apenas no browser. */
export const IS_JSDOM = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent);

export interface PdfReaderState {
  containerRef: React.RefObject<HTMLDivElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  currentPage: number;
  totalPages: number;
  zoom: number;
  colorMode: PdfColorMode;
  isUnavailable: boolean;
  isLoading: boolean;
  hasRenderedPdf: boolean;
  currentChunk: PdfPageChunk | undefined;
  handleScroll: (event: React.UIEvent<HTMLDivElement>) => void;
  handleNextPage: () => void;
  handlePrevPage: () => void;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleToggleColorMode: () => void;
  handleReconnect: () => void;
}

/**
 * Hook de apresentação do leitor de PDF: orquestra pdf.js e a persistência no
 * repositório; as regras de página/zoom/rolagem ficam no domínio do módulo.
 */
export function usePdfReader(document: Document): PdfReaderState {
  const repository = useLibraryRepository();
  const initialReadingState = normalizeReadingState(
    repository.getDocumentReadingState(document.id),
  );

  const [currentPage, setCurrentPage] = useState<number>(initialReadingState.currentPage);
  const [zoom, setZoom] = useState<number>(initialReadingState.zoom);
  const [colorMode, setColorMode] = useState<PdfColorMode>(initialReadingState.colorMode);
  const [relativeScrollPosition, setRelativeScrollPosition] = useState<number>(
    initialReadingState.relativeScrollPosition,
  );
  const [loadedChunks, setLoadedChunks] = useState<Record<number, PdfPageChunk>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUnavailable, setIsUnavailable] = useState<boolean>(!!document.isUnavailable);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);

  const totalPages = pageCount ?? document.totalPages;

  // Carrega o documento PDF real (worker local) quando disponível.
  useEffect(() => {
    if (IS_JSDOM || isUnavailable) return;
    let cancelled = false;
    let task: PDFDocumentLoadingTask | null = null;

    (async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
        task = pdfjs.getDocument({ url: document.fileUrl });
        const loaded = await task.promise;
        if (cancelled) return;
        setPdfDoc(loaded);
        setPageCount(loaded.numPages);
        await repository.saveDocumentPageCount(document.id, loaded.numPages).catch(() => undefined);
        setCurrentPage((prev) => Math.min(prev, loaded.numPages));
      } catch {
        if (!cancelled) {
          setPdfDoc(null);
          setPageCount(null);
          setIsUnavailable(true);
        }
      }
    })();

    return () => {
      cancelled = true;
      task?.destroy();
      setPdfDoc(null);
      setPageCount(null);
    };
  }, [document.fileUrl, document.id, isUnavailable, repository]);

  // Renderiza a página atual no canvas conforme página, zoom e modo de cor.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!pdfDoc || !canvas || IS_JSDOM) return;

    let cancelled = false;
    let renderTask: ReturnType<Awaited<ReturnType<PDFDocumentProxy['getPage']>>['render']> | null =
      null;

    (async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);
        if (cancelled) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const outputScale = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
        const pageWidth = page.getViewport({ scale: 1 }).width;
        const viewport = page.getViewport({ scale: fitPageScale(pageWidth, 720, zoom) });
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = 'auto';

        renderTask = page.render({
          canvas,
          canvasContext: ctx,
          viewport,
          transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined,
        });
        await renderTask.promise;
      } catch {
        /* renderização cancelada ou indisponível */
      }
    })();

    return () => {
      cancelled = true;
      try {
        renderTask?.cancel();
      } catch {
        /* ignore */
      }
    };
  }, [pdfDoc, currentPage, zoom, colorMode]);

  // Persiste estado de leitura a cada alteração
  const persistState = useCallback(
    (page: number, currentZoom: number, mode: PdfColorMode, scroll: number) => {
      repository.saveDocumentReadingState(document.id, {
        currentPage: page,
        zoom: currentZoom,
        colorMode: mode,
        relativeScrollPosition: scroll,
        lastAccessedAt: new Date().toISOString(),
        completedAt: repository.getDocumentReadingState(document.id).completedAt,
      });
    },
    [repository, document.id],
  );

  useEffect(() => {
    persistState(currentPage, zoom, colorMode, relativeScrollPosition);
  }, [currentPage, zoom, colorMode, relativeScrollPosition, persistState]);

  // Carregamento parcial de páginas em janela curta em torno da página atual
  const loadPageRange = useCallback(
    async (page: number) => {
      try {
        setIsLoading(true);
        const { startPage, endPage } = pageRange(page, document.totalPages);
        const chunks = await repository.fetchPageRange(document.id, startPage, endPage);
        setLoadedChunks((prev) => {
          const next = { ...prev };
          chunks.forEach((chunk) => {
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
    },
    [repository, document.id, document.totalPages],
  );

  useEffect(() => {
    loadPageRange(currentPage);
  }, [currentPage, loadPageRange]);

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    if (target.scrollHeight - target.clientHeight > 0) {
      setRelativeScrollPosition(
        scrollRatio(target.scrollTop, target.scrollHeight, target.clientHeight),
      );
    }
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage((prev) => nextPage(prev, totalPages));
  }, [totalPages]);

  const handlePrevPage = useCallback(() => {
    setCurrentPage((prev) => previousPage(prev));
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => zoomIn(prev));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => zoomOut(prev));
  }, []);

  const handleToggleColorMode = useCallback(() => {
    setColorMode((prev) => toggleColorMode(prev));
  }, []);

  const handleReconnect = useCallback(() => {
    repository.setDocumentUnavailable(document.id, false);
    setIsUnavailable(false);
    loadPageRange(currentPage);
  }, [repository, document.id, currentPage, loadPageRange]);

  return {
    containerRef,
    canvasRef,
    currentPage,
    totalPages,
    zoom,
    colorMode,
    isUnavailable,
    isLoading,
    hasRenderedPdf: pdfDoc !== null,
    currentChunk: loadedChunks[currentPage],
    handleScroll,
    handleNextPage,
    handlePrevPage,
    handleZoomIn,
    handleZoomOut,
    handleToggleColorMode,
    handleReconnect,
  };
}
