import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlayerUnavailableState } from '@/modules/player/presentation/components/PlayerUnavailableState';

describe('PlayerUnavailableState', () => {
  it('renderiza estado de formato não suportado com destaque para o formato', () => {
    const onReconnect = vi.fn();
    render(
      <PlayerUnavailableState
        errorInfo={{
          kind: 'unsupported_format',
          format: 'MKV',
          title: 'Formato de vídeo não suportado',
          message: 'O formato .mkv ou o codec deste vídeo não é compatível nativamente.',
          suggestion: 'Recomendamos converter para MP4 ou WebM.',
        }}
        onReconnect={onReconnect}
      />,
    );

    expect(screen.getByTestId('player-error')).toBeInTheDocument();
    expect(screen.getByText('Formato de vídeo não suportado')).toBeInTheDocument();
    expect(screen.getByText('MKV')).toBeInTheDocument();
    expect(screen.getByText(/O formato \.mkv ou o codec deste vídeo não é compatível/i)).toBeInTheDocument();
    expect(screen.getByText(/converter para MP4 ou WebM/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));
    expect(onReconnect).toHaveBeenCalledTimes(1);
  });

  it('renderiza estado de arquivo corrompido com mensagem explicativa', () => {
    const onReconnect = vi.fn();
    render(
      <PlayerUnavailableState
        errorInfo={{
          kind: 'corrupted',
          format: 'MP4',
          title: 'Arquivo corrompido ou danificado',
          message: 'Ocorreu uma falha ao decodificar os dados do vídeo.',
          suggestion: 'Tente copiar novamente o arquivo.',
        }}
        onReconnect={onReconnect}
      />,
    );

    expect(screen.getByTestId('player-error')).toBeInTheDocument();
    expect(screen.getByText('Arquivo corrompido ou danificado')).toBeInTheDocument();
    expect(screen.getByText('MP4')).toBeInTheDocument();
    expect(screen.getByText(/Ocorreu uma falha ao decodificar/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument();
  });

  it('renderiza estado de arquivo indisponível / HD desconectado por padrão', () => {
    const onReconnect = vi.fn();
    render(<PlayerUnavailableState onReconnect={onReconnect} />);

    expect(screen.getByTestId('player-error')).toBeInTheDocument();
    expect(screen.getByText('Arquivo indisponível ou HD desconectado')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tentar reconectar/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /tentar reconectar/i }));
    expect(onReconnect).toHaveBeenCalledTimes(1);
  });
});
