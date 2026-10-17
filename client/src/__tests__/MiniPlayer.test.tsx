import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '@/app/App';
import { MOCK_COURSES } from '@/modules/library/infrastructure/mock-library-repository';

const COURSE_TITLE = MOCK_COURSES[0].title;

const openCoursePlayer = () => {
  fireEvent.click(screen.getByRole('button', { name: /^biblioteca$/i }));
  fireEvent.click(screen.getByRole('button', { name: /^abrir biblioteca cursos$/i }));
  fireEvent.click(screen.getByText(COURSE_TITLE));
  fireEvent.click(screen.getByRole('button', { name: /assistir aula 1\.1 visão geral/i }));
};

describe('MIDOTECA - Mini Player (continuar assistindo fora do player)', () => {
  it('ao sair do player a reprodução continua em um mini player', () => {
    render(<App />);

    openCoursePlayer();
    expect(screen.getByTestId('video-player-container')).toBeInTheDocument();
    expect(screen.queryByTestId('mini-player')).not.toBeInTheDocument();

    // Volta do player → deve minimizar em vez de encerrar
    fireEvent.click(screen.getByRole('button', { name: /voltar para detalhes do curso/i }));

    // A tela de detalhes reaparece e o mini player continua ativo
    expect(screen.getByRole('heading', { name: COURSE_TITLE, level: 1 })).toBeInTheDocument();
    expect(screen.getByTestId('mini-player')).toBeInTheDocument();
    expect(screen.queryByTestId('video-player-container')).not.toBeInTheDocument();
  });

  it('clicar no mini player restaura a tela cheia do player', () => {
    render(<App />);

    openCoursePlayer();
    fireEvent.click(screen.getByRole('button', { name: /voltar para detalhes do curso/i }));

    const miniPlayer = screen.getByTestId('mini-player');
    expect(miniPlayer).toBeInTheDocument();

    // Expande de volta
    fireEvent.click(miniPlayer);
    expect(screen.getByTestId('video-player-container')).toBeInTheDocument();
    expect(screen.queryByTestId('mini-player')).not.toBeInTheDocument();
  });

  it('o botão de expandir do mini player também restaura a tela cheia', () => {
    render(<App />);

    openCoursePlayer();
    fireEvent.click(screen.getByRole('button', { name: /voltar para detalhes do curso/i }));

    fireEvent.click(screen.getByRole('button', { name: /expandir mini player/i }));
    expect(screen.getByTestId('video-player-container')).toBeInTheDocument();
  });

  it('fechar o mini player encerra a sessão de reprodução', () => {
    render(<App />);

    openCoursePlayer();
    fireEvent.click(screen.getByRole('button', { name: /voltar para detalhes do curso/i }));
    expect(screen.getByTestId('mini-player')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /fechar mini player/i }));
    expect(screen.queryByTestId('mini-player')).not.toBeInTheDocument();
  });

  it('navegar pela sidebar para outra tela também minimiza a reprodução', () => {
    render(<App />);

    openCoursePlayer();

    // Navega para Início pela sidebar
    fireEvent.click(screen.getByRole('button', { name: /início/i }));

    expect(screen.getByRole('heading', { name: /início/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByTestId('mini-player')).toBeInTheDocument();
  });

  it('filmes também continuam no mini player ao sair do player', () => {
    render(<App />);

    // Abre um filme a partir do Início
    fireEvent.click(screen.getByTestId(/^home-movie-/));
    expect(screen.getByTestId('movie-player-canvas')).toBeInTheDocument();

    // Volta do player de filme
    fireEvent.click(screen.getByRole('button', { name: /^voltar$/i }));

    expect(screen.getByTestId('mini-player')).toBeInTheDocument();
    expect(screen.queryByTestId('movie-player-canvas')).not.toBeInTheDocument();
  });
});
