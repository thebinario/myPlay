import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import packageJson from '../../../../package.json';
import { Sidebar } from '@/modules/home/presentation/Sidebar';

const NAV = ['Início', 'Biblioteca', 'Pesquisa', 'Configurações'];

describe('home/presentation — Sidebar', () => {
  describe('expandida', () => {
    it('mostra a marca, os destinos com nome e o atalho da pesquisa', () => {
      render(<Sidebar currentTab="home" onNavigate={() => {}} />);
      expect(screen.getByText('Midoteca')).toBeInTheDocument();
      for (const name of NAV) expect(screen.getByText(name)).toBeInTheDocument();
      expect(screen.getByText('Ctrl K')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Recolher menu' })).toBeInTheDocument();
    });

    it('marca só o destino atual (detalhe de curso conta como Biblioteca)', () => {
      render(<Sidebar currentTab="course-details" onNavigate={() => {}} />);
      expect(screen.getByRole('button', { name: 'Biblioteca' })).toHaveAttribute(
        'aria-current',
        'page',
      );
      for (const name of ['Início', 'Pesquisa', 'Configurações']) {
        expect(screen.getByRole('button', { name })).not.toHaveAttribute('aria-current');
      }
    });

    it('navega ao clicar num destino e na marca', () => {
      const onNavigate = vi.fn();
      render(<Sidebar currentTab="library" onNavigate={onNavigate} />);
      fireEvent.click(screen.getByRole('button', { name: 'Pesquisa' }));
      fireEvent.click(screen.getByRole('button', { name: 'Midoteca — página inicial' }));
      expect(onNavigate.mock.calls).toEqual([['search'], ['home']]);
    });
  });

  describe('recolhida', () => {
    it('mostra só os ícones; o nome fica no tooltip e no nome acessível', () => {
      render(<Sidebar currentTab="home" onNavigate={() => {}} collapsed />);
      expect(screen.queryByText('Biblioteca')).not.toBeInTheDocument();
      expect(screen.queryByText('Midoteca')).not.toBeInTheDocument();
      expect(screen.queryByText('Minha conta')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Biblioteca' })).toHaveAttribute(
        'title',
        'Biblioteca',
      );
    });

    it('alterna entre recolher e expandir', () => {
      const onToggleCollapsed = vi.fn();
      const { rerender } = render(
        <Sidebar currentTab="home" onNavigate={() => {}} onToggleCollapsed={onToggleCollapsed} />,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Recolher menu' }));
      rerender(
        <Sidebar
          currentTab="home"
          onNavigate={() => {}}
          collapsed
          onToggleCollapsed={onToggleCollapsed}
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Expandir menu' }));
      expect(onToggleCollapsed).toHaveBeenCalledTimes(2);
    });
  });

  describe('conta', () => {
    it('mostra "Sincronizado" quando nada está sendo processado e abre Configurações', () => {
      const onNavigate = vi.fn();
      render(<Sidebar currentTab="home" onNavigate={onNavigate} />);
      expect(screen.getByText('Minha conta')).toBeInTheDocument();
      expect(screen.getByText('Sincronizado')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /minha conta/i }));
      expect(onNavigate).toHaveBeenCalledWith('settings');
    });

    it('mostra "Atualizando…" enquanto o núcleo processa algo', () => {
      render(<Sidebar currentTab="home" onNavigate={() => {}} syncing />);
      expect(screen.getByText('Atualizando…')).toBeInTheDocument();
    });

    it('informa a versão do app no nome acessível e no tooltip da conta', () => {
      render(<Sidebar currentTab="home" onNavigate={() => {}} collapsed />);
      const account = screen.getByRole('button', { name: /minha conta/i });
      expect(account).toHaveAccessibleName(
        `Minha conta — Sincronizado · Midoteca v${packageJson.version}`,
      );
      expect(account).toHaveAttribute('title', expect.stringContaining(packageJson.version));
    });
  });
});
