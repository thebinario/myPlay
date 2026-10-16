import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VideoPlayerView } from '@/modules/player/presentation/VideoPlayerView';
import { MOCK_COURSES, mockLibraryService } from '@/modules/library/infrastructure/mock-library-repository';
import { Course, Lesson } from '@/core/domain/library';

describe('MIDOTECA - Entrega 02: Player Mockado & Legendas (Telas 04 e 11)', () => {
  let sampleCourse: Course;
  let sampleLesson: Lesson;

  beforeEach(() => {
    sampleCourse = JSON.parse(JSON.stringify(MOCK_COURSES[0]));
    sampleLesson = sampleCourse.modules[0].lessons[0];
    mockLibraryService.resetCourse(sampleCourse.id);
  });

  it('deve renderizar o container do player em formato 16:9 com título da aula e curso', () => {
    render(
      <VideoPlayerView course={sampleCourse} initialLessonId={sampleLesson.id} onBack={vi.fn()} />,
    );

    expect(screen.getByTestId('video-player-container')).toHaveAttribute(
      'data-aspect-ratio',
      '16:9',
    );
    expect(screen.getByText(sampleLesson.title)).toBeInTheDocument();
    expect(screen.getByText(sampleCourse.title)).toBeInTheDocument();
  });

  it('deve alternar entre reproduzir e pausar ao clicar no botão de play/pause', () => {
    render(
      <VideoPlayerView course={sampleCourse} initialLessonId={sampleLesson.id} onBack={vi.fn()} />,
    );

    const playPauseBtn = screen.getByRole('button', { name: /reproduzir vídeo|pausar vídeo/i });
    expect(playPauseBtn).toHaveAttribute('aria-label', 'Reproduzir vídeo');

    // Inicia reprodução
    fireEvent.click(playPauseBtn);
    expect(screen.getByRole('button', { name: /pausar vídeo/i })).toBeInTheDocument();

    // Pausa
    fireEvent.click(screen.getByRole('button', { name: /pausar vídeo/i }));
    expect(screen.getByRole('button', { name: /reproduzir vídeo/i })).toBeInTheDocument();
  });

  it('deve avançar e retroceder o tempo de reprodução em 10 segundos', () => {
    render(
      <VideoPlayerView course={sampleCourse} initialLessonId={sampleLesson.id} onBack={vi.fn()} />,
    );

    // O tempo inicial restaurado foi de 120s (2:00)
    expect(screen.getByTestId('current-time')).toHaveTextContent('02:00');

    // Avança 10s
    const forwardBtn = screen.getByRole('button', { name: /avançar 10 segundos/i });
    fireEvent.click(forwardBtn);
    expect(screen.getByTestId('current-time')).toHaveTextContent('02:10');

    // Retrocede 10s
    const rewindBtn = screen.getByRole('button', { name: /retroceder 10 segundos/i });
    fireEvent.click(rewindBtn);
    expect(screen.getByTestId('current-time')).toHaveTextContent('02:00');
  });

  it('deve alterar a velocidade de reprodução', () => {
    render(
      <VideoPlayerView course={sampleCourse} initialLessonId={sampleLesson.id} onBack={vi.fn()} />,
    );

    const speedBtn = screen.getByRole('button', { name: /velocidade de reprodução: 1x/i });
    fireEvent.click(speedBtn);

    // Seleciona 1.5x
    const speedOption = screen.getByRole('button', { name: /1\.5x/i });
    fireEvent.click(speedOption);

    expect(
      screen.getByRole('button', { name: /velocidade de reprodução: 1\.5x/i }),
    ).toBeInTheDocument();
  });

  it('deve navegar entre aulas anterior e próxima', () => {
    render(
      <VideoPlayerView course={sampleCourse} initialLessonId={sampleLesson.id} onBack={vi.fn()} />,
    );

    // Avança para a próxima aula
    const nextBtn = screen.getByRole('button', { name: /próxima aula/i });
    fireEvent.click(nextBtn);

    // Deve exibir o título da aula 1.2
    expect(screen.getByText('1.2 Configuração do Ambiente e Hot Reload')).toBeInTheDocument();

    // Volta para a aula anterior
    const prevBtn = screen.getByRole('button', { name: /aula anterior/i });
    fireEvent.click(prevBtn);
    expect(screen.getByText('1.1 Visão Geral e Comparação com Electron')).toBeInTheDocument();
  });

  it('deve persistir o progresso no mock e restaurá-lo ao reabrir o player', () => {
    const { unmount } = render(
      <VideoPlayerView course={sampleCourse} initialLessonId={sampleLesson.id} onBack={vi.fn()} />,
    );

    // Avança para 130s
    fireEvent.click(screen.getByRole('button', { name: /avançar 10 segundos/i }));
    expect(screen.getByTestId('current-time')).toHaveTextContent('02:10');

    // Desmonta o player (simulando sair para outra tela)
    unmount();

    // Re-renderiza o player
    render(
      <VideoPlayerView course={sampleCourse} initialLessonId={sampleLesson.id} onBack={vi.fn()} />,
    );

    // O progresso de 130s (02:10) deve ter sido restaurado com exatidão
    expect(screen.getByTestId('current-time')).toHaveTextContent('02:10');
  });

  it('deve abrir menu flutuante de legendas (CC), selecionar idioma em 1 clique e fechar automaticamente', () => {
    render(
      <VideoPlayerView course={sampleCourse} initialLessonId={sampleLesson.id} onBack={vi.fn()} />,
    );

    const ccBtn = screen.getByRole('button', { name: /legendas e idiomas \(cc\)/i });
    fireEvent.click(ccBtn);

    // Menu flutuante contextual é aberto
    const menu = screen.getByTestId('subtitles-floating-menu');
    expect(menu).toBeInTheDocument();

    // Seleciona English em 1 clique
    const englishOption = screen.getByRole('button', { name: /english/i });
    fireEvent.click(englishOption);

    // O menu fecha automaticamente
    expect(screen.queryByTestId('subtitles-floating-menu')).not.toBeInTheDocument();

    // Exibe a legenda em inglês ativa na tela
    expect(screen.getByTestId('subtitles-display')).toHaveTextContent(
      /In this lesson we compare Tauri with Electron/i,
    );
  });

  it('deve permitir desativar legendas pelo menu CC', () => {
    render(
      <VideoPlayerView course={sampleCourse} initialLessonId={sampleLesson.id} onBack={vi.fn()} />,
    );

    // Abre CC
    fireEvent.click(screen.getByRole('button', { name: /legendas e idiomas \(cc\)/i }));

    // Clica em "Desativar legendas"
    const disableOption = screen.getByRole('button', { name: /desativar legendas/i });
    fireEvent.click(disableOption);

    // Não deve haver texto de legenda na tela
    expect(screen.queryByTestId('subtitles-display')).not.toBeInTheDocument();
  });

  it('deve exibir estado de arquivo indisponível / HD desconectado com opção de tentar novamente', () => {
    // Cria uma aula simulando arquivo indisponível
    const unavailableLesson: Lesson = {
      ...sampleLesson,
      id: 'les-missing',
      title: 'Aula com Arquivo Removido',
      isUnavailable: true,
    };

    const courseWithMissingLesson: Course = {
      ...sampleCourse,
      modules: [
        {
          ...sampleCourse.modules[0],
          lessons: [unavailableLesson],
        },
      ],
    };

    render(
      <VideoPlayerView
        course={courseWithMissingLesson}
        initialLessonId="les-missing"
        onBack={vi.fn()}
      />,
    );

    // Estado de erro claro
    expect(screen.getByText(/arquivo indisponível ou hd desconectado/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tentar reconectar/i })).toBeInTheDocument();
  });
});
