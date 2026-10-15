/**
 * MIDOTECA — Etapa 3B: Tela Início melhorada
 * Ciclo TDD: Red → Green → Refactor
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { HomeView } from '../components/home/HomeView';
import { MOCK_COURSES, MOCK_MOVIES, MOCK_DOCUMENTS } from '../services/mockData';
import type { Course, Movie, Document } from '../types/library';

const inProgressCourse = MOCK_COURSES.find(c => c.progress > 0 && c.progress < 100)!;
const inProgressMovie = MOCK_MOVIES.find(m => m.progress > 0 && m.progress < 100)!;
const inProgressDoc = MOCK_DOCUMENTS.find(d => d.lastReadPage > 1)!;

const zeroCourse: Course = { ...MOCK_COURSES[0], progress: 0, id: 'zero-course' };
const zeroMovie: Movie = { ...MOCK_MOVIES[0], progress: 0, id: 'zero-movie' };
const zeroDoc: Document = { ...MOCK_DOCUMENTS[0], lastReadPage: 1, id: 'zero-doc' };

const onSelectCourse = vi.fn();
const onOpenMovie = vi.fn();
const onOpenDocument = vi.fn();
const onExploreLibrary = vi.fn();
const onSearchOpen = vi.fn();

function renderHome(overrides?: Partial<React.ComponentProps<typeof HomeView>>) {
  return render(
    <HomeView
      courses={[inProgressCourse]}
      movies={[inProgressMovie]}
      documents={[inProgressDoc]}
      onSelectCourse={onSelectCourse}
      onOpenMovie={onOpenMovie}
      onOpenDocument={onOpenDocument}
      onExploreLibrary={onExploreLibrary}
      onSearchOpen={onSearchOpen}
      {...overrides}
    />,
  );
}

describe('HomeView — Tela Início', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exibe seção "Continue assistindo" quando há curso em andamento', () => {
    renderHome();
    expect(screen.getByText(/continue assistindo/i)).toBeInTheDocument();
  });

  it('exibe seção "Continue lendo" quando há documento em andamento', () => {
    renderHome();
    expect(screen.getByText(/continue lendo/i)).toBeInTheDocument();
  });

  it('exibe o título do curso em andamento', () => {
    renderHome();
    expect(screen.getByText(inProgressCourse.title)).toBeInTheDocument();
  });

  it('exibe o progresso do curso em andamento', () => {
    renderHome();
    expect(screen.getByText(new RegExp(`${inProgressCourse.progress}%`))).toBeInTheDocument();
  });

  it('clicar no curso chama onSelectCourse com o ID correto', async () => {
    const user = userEvent.setup();
    renderHome();
    const card = screen.getByTestId(`home-course-${inProgressCourse.id}`);
    await user.click(card);
    expect(onSelectCourse).toHaveBeenCalledWith(inProgressCourse.id);
  });

  it('exibe o título do filme em andamento', () => {
    renderHome();
    expect(screen.getByText(inProgressMovie.title)).toBeInTheDocument();
  });

  it('clicar no filme chama onOpenMovie com o ID correto', async () => {
    const user = userEvent.setup();
    renderHome();
    const card = screen.getByTestId(`home-movie-${inProgressMovie.id}`);
    await user.click(card);
    expect(onOpenMovie).toHaveBeenCalledWith(inProgressMovie.id);
  });

  it('exibe o título do documento em andamento', () => {
    renderHome();
    expect(screen.getByText(inProgressDoc.title)).toBeInTheDocument();
  });

  it('exibe o número da última página do documento', () => {
    renderHome();
    expect(
      screen.getByText(new RegExp(`Página ${inProgressDoc.lastReadPage}`)),
    ).toBeInTheDocument();
  });

  it('clicar no documento chama onOpenDocument com o ID correto', async () => {
    const user = userEvent.setup();
    renderHome();
    const card = screen.getByTestId(`home-doc-${inProgressDoc.id}`);
    await user.click(card);
    expect(onOpenDocument).toHaveBeenCalledWith(inProgressDoc.id);
  });

  it('exibe estado vazio (primeiro uso) quando não há histórico', () => {
    renderHome({
      courses: [zeroCourse],
      movies: [zeroMovie],
      documents: [zeroDoc],
    });
    expect(screen.getByTestId('home-empty-state')).toBeInTheDocument();
  });

  it('mantém o título do app visível mesmo com HD desconectado (doc indisponível)', () => {
    const unavailableDoc: Document = { ...inProgressDoc, isUnavailable: true };
    renderHome({ documents: [unavailableDoc] });
    // Título do app (hero header) deve permanecer
    expect(screen.getByRole('heading', { name: /início/i })).toBeInTheDocument();
    // Card do documento ainda aparece (catálogo navegável offline)
    expect(screen.getByTestId(`home-doc-${unavailableDoc.id}`)).toBeInTheDocument();
  });

  it('exibe botão de atalho para pesquisa', () => {
    renderHome();
    expect(screen.getByTestId('home-search-shortcut')).toBeInTheDocument();
  });

  it('clicar no atalho de pesquisa chama onSearchOpen', async () => {
    const user = userEvent.setup();
    renderHome();
    await user.click(screen.getByTestId('home-search-shortcut'));
    expect(onSearchOpen).toHaveBeenCalled();
  });
});
