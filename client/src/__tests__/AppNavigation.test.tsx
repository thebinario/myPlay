import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../App';

describe('MIDOTECA - Fundação Visual e Navegação', () => {
  it('deve renderizar a sidebar compacta com logo MIDOTECA e botões de navegação', () => {
    render(<App />);

    // Brand MIDOTECA na sidebar (pode aparecer em múltiplos elementos)
    expect(screen.getAllByText('MIDOTECA').length).toBeGreaterThan(0);

    // Itens principais de navegação na sidebar
    expect(screen.getByRole('button', { name: /início/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^biblioteca$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^pesquisa$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /configurações/i })).toBeInTheDocument();
  });

  it('deve iniciar na tela de Início por padrão e permitir navegar para Biblioteca', () => {
    render(<App />);

    // App inicia em Início (home)
    expect(screen.getByRole('heading', { name: /início/i, level: 1 })).toBeInTheDocument();

    // Clica no botão Biblioteca na sidebar
    const libraryBtn = screen.getByRole('button', { name: /^biblioteca$/i });
    fireEvent.click(libraryBtn);

    // Valida que a tela Biblioteca é exibida
    expect(screen.getByRole('heading', { name: /biblioteca/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /todos/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /cursos/i })).toBeInTheDocument();
  });

  it('deve permitir navegar de volta para Início ao clicar no menu', () => {
    render(<App />);

    // Navega para Biblioteca
    fireEvent.click(screen.getByRole('button', { name: /^biblioteca$/i }));
    expect(screen.getByRole('heading', { name: /biblioteca/i, level: 1 })).toBeInTheDocument();

    // Volta para Início usando o botão da sidebar
    fireEvent.click(screen.getByRole('button', { name: /início/i }));
    expect(screen.getByRole('heading', { name: /início/i, level: 1 })).toBeInTheDocument();
  });

  it('deve executar o fluxo completo: Biblioteca -> Detalhes -> Editor de Cursos -> Player', () => {
    render(<App />);

    // 1. Navega para biblioteca
    fireEvent.click(screen.getByRole('button', { name: /^biblioteca$/i }));

    // 2. Clica no card do curso
    fireEvent.click(screen.getByText('Arquitetura Desktop Moderna com Tauri & React'));
    expect(
      screen.getByRole('button', { name: /editar organização do curso/i }),
    ).toBeInTheDocument();

    // 3. Abre o Editor de Cursos
    fireEvent.click(screen.getByRole('button', { name: /editar organização do curso/i }));
    expect(screen.getByText(/editor de curso/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /salvar alterações/i })).toBeInTheDocument();

    // 4. Volta para detalhes
    fireEvent.click(screen.getByRole('button', { name: /voltar para detalhes do curso/i }));
    expect(
      screen.getByRole('heading', {
        name: 'Arquitetura Desktop Moderna com Tauri & React',
        level: 1,
      }),
    ).toBeInTheDocument();

    // 5. Inicia reprodução no Player
    const playLessonBtn = screen.getByRole('button', { name: /assistir aula 1\.1 visão geral/i });
    fireEvent.click(playLessonBtn);

    // 6. Valida player 16:9 e menu de legendas
    expect(screen.getByTestId('video-player-container')).toHaveAttribute(
      'data-aspect-ratio',
      '16:9',
    );
    expect(screen.getByRole('button', { name: /legendas e idiomas \(cc\)/i })).toBeInTheDocument();
  });

  it('deve abrir um PDF a partir da Biblioteca e retornar ao Início', () => {
    render(<App />);

    // Navega para Biblioteca
    fireEvent.click(screen.getByRole('button', { name: /^biblioteca$/i }));

    // Clica no card de documento na Biblioteca
    fireEvent.click(screen.getByText('Clean Architecture para Aplicações Frontend.pdf'));

    // Valida que o leitor de PDF abriu
    expect(screen.getByRole('button', { name: /voltar da leitura/i })).toBeInTheDocument();
    expect(screen.getByTestId('pdf-page-canvas')).toBeInTheDocument();

    // Retorna — agora vai para Início (comportamento novo da Etapa 3B)
    fireEvent.click(screen.getByRole('button', { name: /voltar da leitura/i }));
    expect(screen.getByRole('heading', { name: /início/i, level: 1 })).toBeInTheDocument();
  });

  it('deve abrir um PDF a partir do Início (Continue lendo) e retomar a leitura', () => {
    render(<App />);

    // App já inicia em Início — clica no documento na seção "Continue lendo"
    fireEvent.click(screen.getByText('Clean Architecture para Aplicações Frontend.pdf'));

    // Deve abrir diretamente no leitor de PDF
    expect(screen.getByRole('button', { name: /voltar da leitura/i })).toBeInTheDocument();
    expect(screen.getByTestId('pdf-page-canvas')).toBeInTheDocument();
  });

  it('deve abrir a Pesquisa ao clicar no botão de atalho no Início', () => {
    render(<App />);

    // Clica no botão "Pesquisar" no banner do Início
    fireEvent.click(screen.getByTestId('home-search-shortcut'));

    // Valida que a tela de pesquisa abriu
    expect(screen.getByRole('heading', { name: /pesquisa universal/i })).toBeInTheDocument();
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });
});
