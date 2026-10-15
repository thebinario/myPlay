import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect, waitFor, fn } from 'storybook/test';
import { MiniPlayer } from '../../../components/player/MiniPlayer';

const meta: Meta<typeof MiniPlayer> = {
  title: 'Player/MiniPlayer',
  component: MiniPlayer,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    controls: { sortBy: ['required', 'default'] },
    background: { default: '#0D111B' },
  },
  argTypes: {
    onExpand: { action: 'expand' },
    onClose: { action: 'close' },
    onProgress: { control: false },
  },
};

export default meta;
type Story = StoryObj<typeof MiniPlayer>;

const baseArgs = {
  mediaKey: 'les-1-1',
  title: '1.1 Visão Geral e Comparação com Electron',
  subtitle: 'Arquitetura Desktop Moderna com Tauri & React',
  thumbnailUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80',
  duration: 900,
  initialTime: 120,
  onExpand: fn(),
  onClose: fn(),
};

/** Mini player de uma aula (pausado) — clique para expandir. */
export const LessonPaused: Story = {
  args: { ...baseArgs, loadingDelayMs: 0 },
};

/** Mini player reproduzindo (continua depois de sair do player). */
export const LessonPlaying: Story = {
  args: { ...baseArgs, loadingDelayMs: 0, bufferingDelayMs: 40, autoPlay: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole('button', { name: /pausar/i });
    await waitFor(() =>
      expect(canvas.getByRole('button', { name: /pausar/i })).toBeTruthy(),
    );
  },
};

/** Variante de filme (destaque verde). */
export const Movie: Story = {
  args: {
    ...baseArgs,
    mediaKey: 'movie-1',
    title: 'Interestelar',
    subtitle: 'Ficção Científica',
    thumbnailUrl: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=600&auto=format&fit=crop&q=80',
    duration: 10140,
    initialTime: 3600,
    accentColor: '#10B981',
    loadingDelayMs: 0,
  },
};

/** Mídia finalizada — oferece replay. */
export const Ended: Story = {
  args: { ...baseArgs, initialTime: 900, loadingDelayMs: 0 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: /reproduzir novamente/i })).toBeTruthy();
  },
};

/** Clicar no mini player expande de volta para a tela cheia. */
export const ExpandsOnClick: Story = {
  args: { ...baseArgs, loadingDelayMs: 0, onExpand: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByTestId('mini-player'));
    await expect(args.onExpand).toHaveBeenCalled();
  },
};

/** Botão de fechar encerra a sessão sem expandir. */
export const CloseButton: Story = {
  args: { ...baseArgs, loadingDelayMs: 0, onClose: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /fechar mini player/i }));
    await expect(args.onClose).toHaveBeenCalled();
  },
};
