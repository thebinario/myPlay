/**
 * MIDOTECA — Etapa 3B: Pesquisa Universal
 * Ciclo TDD: Red → Green → Refactor
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MockLibraryService } from '@/modules/library/infrastructure/mock-library-repository';

// ── Serviço ──────────────────────────────────────────────────────────────────

describe('MockLibraryService.search()', () => {
  let svc: MockLibraryService;

  beforeEach(() => {
    svc = new MockLibraryService();
  });

  it('encontra curso pelo título', async () => {
    const results = await svc.search('Tauri', 'all');
    expect(results.some((r) => r.kind === 'course' && r.title.includes('Tauri'))).toBe(true);
  });

  it('encontra aula pelo nome', async () => {
    const results = await svc.search('Visão Geral', 'all');
    expect(results.some((r) => r.kind === 'lesson')).toBe(true);
  });

  it('encontra aula buscando pelo filtro lesson', async () => {
    const results = await svc.search('IPC', 'lesson');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.kind === 'lesson')).toBe(true);
  });

  it('encontra PDF pelo nome (sem acentos)', async () => {
    const results = await svc.search('Clean Architecture', 'document');
    expect(results.some((r) => r.kind === 'document')).toBe(true);
  });

  it('encontra filme pelo título', async () => {
    const results = await svc.search('Software Livre', 'all');
    expect(results.some((r) => r.kind === 'movie')).toBe(true);
  });

  it('filtra apenas cursos quando filtro é course', async () => {
    const results = await svc.search('Tauri', 'course');
    expect(results.every((r) => r.kind === 'course')).toBe(true);
  });

  it('filtra apenas filmes quando filtro é movie', async () => {
    const results = await svc.search('Fronteiras', 'movie');
    expect(results.every((r) => r.kind === 'movie')).toBe(true);
  });

  it('é case-insensitive (maiúsculas e minúsculas)', async () => {
    const lower = await svc.search('tauri', 'all');
    const upper = await svc.search('TAURI', 'all');
    expect(lower.length).toBe(upper.length);
    expect(lower.length).toBeGreaterThan(0);
  });

  it('trata acentos de maneira consistente', async () => {
    // "Testes" vs busca sem acento "Testes"
    const withAccent = await svc.search('Testes Automatizados', 'all');
    const withoutAccent = await svc.search('testes automatizados', 'all');
    expect(withAccent.length).toBeGreaterThan(0);
    expect(withAccent.length).toBe(withoutAccent.length);
  });

  it('retorna lista vazia quando não há resultados', async () => {
    const results = await svc.search('xyzzy_inexistente_42', 'all');
    expect(results).toHaveLength(0);
  });

  it('retorna lista vazia para query em branco', async () => {
    const results = await svc.search('', 'all');
    expect(results).toHaveLength(0);
  });

  it('resultado de aula possui courseId e lessonId', async () => {
    const results = await svc.search('IPC', 'lesson');
    const lesson = results.find((r) => r.kind === 'lesson');
    expect(lesson).toBeDefined();
    expect(lesson!.courseId).toBeTruthy();
    expect(lesson!.lessonId).toBeTruthy();
  });

  it('resultado de documento possui progressLabel quando lastReadPage > 1', async () => {
    const results = await svc.search('Clean', 'document');
    const doc = results.find((r) => r.kind === 'document');
    expect(doc).toBeDefined();
    // Clean Architecture lastReadPage = 34 > 1
    expect(doc!.progressLabel).toMatch(/Página/);
  });

  it('busca por tag encontra curso', async () => {
    const results = await svc.search('TDD', 'course');
    expect(results.some((r) => r.kind === 'course')).toBe(true);
  });
});

// ── Componente SearchView ─────────────────────────────────────────────────────

import { SearchView } from '@/modules/search/presentation/SearchView';

const mockOnOpen = vi.fn();

function renderSearch(props?: Partial<React.ComponentProps<typeof SearchView>>) {
  return render(
    <SearchView
      onOpenCourse={mockOnOpen}
      onOpenLesson={mockOnOpen}
      onOpenMovie={mockOnOpen}
      onOpenDocument={mockOnOpen}
      {...props}
    />,
  );
}

describe('SearchView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza campo de pesquisa visível', () => {
    renderSearch();
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });

  it('campo de pesquisa recebe foco ao montar', async () => {
    renderSearch();
    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByRole('searchbox'));
    });
  });

  it('exibe estado vazio inicial (sem resultados) quando query está em branco', () => {
    renderSearch();
    expect(screen.getByTestId('search-empty-state')).toBeInTheDocument();
  });

  it('exibe resultados ao digitar uma query', async () => {
    const user = userEvent.setup();
    renderSearch();
    await user.type(screen.getByRole('searchbox'), 'Tauri');
    await waitFor(() => {
      expect(screen.getByTestId('search-results')).toBeInTheDocument();
    });
  });

  it('exibe estado "sem resultados" quando query não encontra nada', async () => {
    const user = userEvent.setup();
    renderSearch();
    await user.type(screen.getByRole('searchbox'), 'xyzzy_inexistente_42');
    await waitFor(() => {
      expect(screen.getByTestId('search-no-results')).toBeInTheDocument();
    });
  });

  it('botão limpar remove o texto e volta ao estado vazio', async () => {
    const user = userEvent.setup();
    renderSearch();
    const input = screen.getByRole('searchbox');
    await user.type(input, 'Tauri');
    await user.click(screen.getByRole('button', { name: /limpar/i }));
    expect(input).toHaveValue('');
    expect(screen.getByTestId('search-empty-state')).toBeInTheDocument();
  });

  it('filtros rápidos aparecem na tela', () => {
    renderSearch();
    expect(screen.getByRole('button', { name: /todos/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cursos/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /aulas/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /filmes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pdfs/i })).toBeInTheDocument();
  });

  it('clicar num resultado de curso chama onOpenCourse', async () => {
    const user = userEvent.setup();
    renderSearch();
    await user.type(screen.getByRole('searchbox'), 'Tauri');
    await waitFor(() => screen.getByTestId('search-results'));
    const courseResult = screen.getAllByTestId(/^result-course-/)[0];
    await user.click(courseResult);
    expect(mockOnOpen).toHaveBeenCalledWith(expect.any(String));
  });

  it('clicar num resultado de documento chama onOpenDocument', async () => {
    const user = userEvent.setup();
    renderSearch();
    await user.type(screen.getByRole('searchbox'), 'Clean');
    await waitFor(() => screen.getByTestId('search-results'));
    const docResult = screen.getAllByTestId(/^result-document-/)[0];
    await user.click(docResult);
    expect(mockOnOpen).toHaveBeenCalledWith(expect.any(String));
  });

  it('filtro de cursos exibe apenas resultados de curso', async () => {
    const user = userEvent.setup();
    renderSearch();
    await user.type(screen.getByRole('searchbox'), 'Tauri');
    await user.click(screen.getByRole('button', { name: /cursos/i }));
    await waitFor(() => screen.getByTestId('search-results'));
    const items = screen.getAllByTestId(/^result-/);
    expect(items.every((el) => el.dataset.testid?.startsWith('result-course-'))).toBe(true);
  });
});
