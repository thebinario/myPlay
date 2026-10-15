import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PdfViewer } from '@/features/documents/presentation/PdfViewer';
import { MOCK_DOCUMENTS, mockLibraryService } from '@/features/library/infrastructure/mockLibraryRepository';
import { Document } from '@/core/domain/library';

describe('MIDOTECA - Etapa 3A: Leitor de PDF Mockado (Tela 09)', () => {
  let sampleDoc: Document;

  beforeEach(() => {
    sampleDoc = JSON.parse(JSON.stringify(MOCK_DOCUMENTS[0])); // Clean Architecture para Aplicações Frontend.pdf (120 páginas, lastReadPage: 34)
    mockLibraryService.resetDocument(sampleDoc.id);
  });

  it('deve abrir o documento restaurando automaticamente a última página lida', async () => {
    render(<PdfViewer document={sampleDoc} onBack={vi.fn()} />);

    // Título do documento no cabeçalho
    expect(screen.getByTitle(sampleDoc.title)).toBeInTheDocument();

    // Deve exibir página inicial restaurada (página 34 de 120)
    await waitFor(() => {
      expect(screen.getByTestId('pdf-current-page')).toHaveTextContent('34');
      expect(screen.getAllByText(/de 120/i)[0]).toBeInTheDocument();
    });
  });

  it('deve permitir navegar entre páginas (próxima e anterior)', async () => {
    render(<PdfViewer document={sampleDoc} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('pdf-current-page')).toHaveTextContent('34');
    });

    // Clica em próxima página
    const nextPageBtn = screen.getByRole('button', { name: /próxima página/i });
    fireEvent.click(nextPageBtn);

    await waitFor(() => {
      expect(screen.getByTestId('pdf-current-page')).toHaveTextContent('35');
    });

    // Clica em página anterior
    const prevPageBtn = screen.getByRole('button', { name: /página anterior/i });
    fireEvent.click(prevPageBtn);

    await waitFor(() => {
      expect(screen.getByTestId('pdf-current-page')).toHaveTextContent('34');
    });
  });

  it('deve permitir alterar o zoom do documento', async () => {
    render(<PdfViewer document={sampleDoc} onBack={vi.fn()} />);

    const zoomDisplay = screen.getByTestId('pdf-zoom-level');
    expect(zoomDisplay).toHaveTextContent('100%');

    // Aumenta o zoom
    const zoomInBtn = screen.getByRole('button', { name: /aumentar zoom/i });
    fireEvent.click(zoomInBtn);
    expect(zoomDisplay).toHaveTextContent('125%');

    // Diminui o zoom
    const zoomOutBtn = screen.getByRole('button', { name: /diminuir zoom/i });
    fireEvent.click(zoomOutBtn);
    expect(zoomDisplay).toHaveTextContent('100%');
  });

  it('deve alternar entre modo escuro e visualização original (cores originais)', async () => {
    render(<PdfViewer document={sampleDoc} onBack={vi.fn()} />);

    const pageContainer = screen.getByTestId('pdf-page-canvas');
    // Por padrão o modo é escuro (Dark Theme #0D111B)
    expect(pageContainer).toHaveAttribute('data-color-mode', 'dark');

    // Alterna para Cores Originais
    const toggleColorBtn = screen.getByRole('button', {
      name: /alternar modo de cor|modo escuro|cores originais/i,
    });
    fireEvent.click(toggleColorBtn);

    expect(pageContainer).toHaveAttribute('data-color-mode', 'original');

    // Alterna de volta para Modo Escuro
    fireEvent.click(toggleColorBtn);
    expect(pageContainer).toHaveAttribute('data-color-mode', 'dark');
  });

  it('deve salvar e restaurar as preferências de leitura (página, zoom e modo de cor) ao fechar e reabrir', async () => {
    const { unmount } = render(<PdfViewer document={sampleDoc} onBack={vi.fn()} />);

    // Avança para a página 40
    const nextPageBtn = screen.getByRole('button', { name: /próxima página/i });
    fireEvent.click(nextPageBtn); // 35
    fireEvent.click(nextPageBtn); // 36

    // Altera zoom para 125%
    fireEvent.click(screen.getByRole('button', { name: /aumentar zoom/i }));

    // Altera para cores originais
    fireEvent.click(
      screen.getByRole('button', { name: /alternar modo de cor|modo escuro|cores originais/i }),
    );

    // Fecha o leitor (desmonta)
    unmount();

    // Reabre o mesmo documento
    render(<PdfViewer document={sampleDoc} onBack={vi.fn()} />);

    // O estado deve ser restaurado fielmente
    await waitFor(() => {
      expect(screen.getByTestId('pdf-current-page')).toHaveTextContent('36');
    });
    expect(screen.getByTestId('pdf-zoom-level')).toHaveTextContent('125%');
    expect(screen.getByTestId('pdf-page-canvas')).toHaveAttribute('data-color-mode', 'original');
  });

  it('deve carregar páginas parcialmente sem solicitar todas as 120 páginas do documento', async () => {
    const fetchSpy = vi.spyOn(mockLibraryService, 'fetchPageRange');

    render(<PdfViewer document={sampleDoc} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('pdf-current-page')).toHaveTextContent('34');
    });

    // O spy deve ter sido chamado para o intervalo em torno da página 34, nunca para todas as 120 páginas
    expect(fetchSpy).toHaveBeenCalled();
    const calls = fetchSpy.mock.calls;
    const lastCall = calls[calls.length - 1];
    const [_, startPage, endPage] = lastCall;

    // Deve carregar uma janela curta (ex: 34 a 36 ou similar), nunca 1 a 120
    expect(endPage - startPage).toBeLessThan(10);
    expect(endPage).toBeLessThan(120);

    fetchSpy.mockRestore();
  });

  it('deve apresentar estado de documento indisponível / HD desconectado com opção de reconexão', async () => {
    // Marca o documento como indisponível
    mockLibraryService.setDocumentUnavailable(sampleDoc.id, true);

    render(<PdfViewer document={sampleDoc} onBack={vi.fn()} />);

    // Estado claro de erro
    await waitFor(() => {
      expect(screen.getByText(/documento indisponível ou hd desconectado/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /tentar reconectar/i })).toBeInTheDocument();
    });

    // Simula reconexão do HD
    mockLibraryService.setDocumentUnavailable(sampleDoc.id, false);
    fireEvent.click(screen.getByRole('button', { name: /tentar reconectar/i }));

    // Deve carregar o documento com sucesso
    await waitFor(() => {
      expect(
        screen.queryByText(/documento indisponível ou hd desconectado/i),
      ).not.toBeInTheDocument();
      expect(screen.getByTestId('pdf-current-page')).toBeInTheDocument();
    });
  });
});
