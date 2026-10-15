import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../App';

describe('MIDOTECA - Fundação Visual e Navegação', () => {
  it('deve renderizar a sidebar compacta com logo MIDOTECA e botões de navegação', () => {
    render(<App />);

    // Brand MIDOTECA na sidebar
    expect(screen.getByText('MIDOTECA')).toBeInTheDocument();

    // Itens principais de navegação na sidebar
    expect(screen.getByRole('button', { name: /início/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /biblioteca/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pesquisa/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /configurações/i })).toBeInTheDocument();
  });

  it('deve iniciar na tela da Biblioteca por padrão e permitir navegar para Início', () => {
    render(<App />);

    // Tela de biblioteca visível com filtros
    expect(screen.getByRole('heading', { name: /biblioteca/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /todos/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /cursos/i })).toBeInTheDocument();

    // Clica no botão Início na sidebar
    const homeBtn = screen.getByRole('button', { name: /início/i });
    fireEvent.click(homeBtn);

    // Valida que a tela inicial agora é exibida
    expect(screen.getByRole('heading', { name: /início/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/continuar de onde parou/i)).toBeInTheDocument();
  });

  it('deve permitir navegar de volta para a Biblioteca ao clicar no menu', () => {
    render(<App />);

    // Navega para Início
    fireEvent.click(screen.getByRole('button', { name: /início/i }));
    expect(screen.getByRole('heading', { name: /início/i, level: 1 })).toBeInTheDocument();

    // Volta para Biblioteca usando o botão da sidebar
    fireEvent.click(screen.getByRole('button', { name: /^biblioteca$/i }));
    expect(screen.getByRole('heading', { name: /biblioteca/i, level: 1 })).toBeInTheDocument();
  });

  it('deve executar o fluxo completo: Biblioteca -> Detalhes -> Editor de Cursos -> Player', () => {
    render(<App />);

    // 1. Clica no card do curso
    fireEvent.click(screen.getByText('Arquitetura Desktop Moderna com Tauri & React'));
    expect(screen.getByRole('button', { name: /editar organização do curso/i })).toBeInTheDocument();

    // 2. Abre o Editor de Cursos
    fireEvent.click(screen.getByRole('button', { name: /editar organização do curso/i }));
    expect(screen.getByText(/editor de curso/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /salvar alterações/i })).toBeInTheDocument();

    // 3. Volta para detalhes
    fireEvent.click(screen.getByRole('button', { name: /voltar para detalhes do curso/i }));
    expect(screen.getByRole('heading', { name: 'Arquitetura Desktop Moderna com Tauri & React', level: 1 })).toBeInTheDocument();

    // 4. Inicia reprodução no Player
    const playLessonBtn = screen.getByRole('button', { name: /assistir aula 1\.1 visão geral/i });
    fireEvent.click(playLessonBtn);

    // 5. Valida player 16:9 e menu de legendas
    expect(screen.getByTestId('video-player-container')).toHaveAttribute('data-aspect-ratio', '16:9');
    expect(screen.getByRole('button', { name: /legendas e idiomas \(cc\)/i })).toBeInTheDocument();
  });
});
