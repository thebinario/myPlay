import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import packageJson from '../../../../package.json';
import { Sidebar } from '@/modules/home/presentation/Sidebar';

describe('home/presentation — Sidebar', () => {
  it('exibe a versão do app publicada no package.json', () => {
    render(<Sidebar currentTab="home" onNavigate={() => {}} />);
    expect(screen.getByText(`v${packageJson.version}`)).toBeInTheDocument();
  });

  it('abre Configurações ao clicar na versão (onde fica o Sobre)', () => {
    const onNavigate = vi.fn();
    render(<Sidebar currentTab="home" onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: /versão/i }));
    expect(onNavigate).toHaveBeenCalledWith('settings');
  });

  it('exibe o indicador de atividade recebido no rodapé', () => {
    render(
      <Sidebar
        currentTab="home"
        onNavigate={() => {}}
        activity={<span data-testid="activity-slot">atividade</span>}
      />,
    );
    expect(screen.getByTestId('activity-slot')).toBeInTheDocument();
  });
});
