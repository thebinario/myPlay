import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect, waitFor, fireEvent, fn } from 'storybook/test';
import { MiniPlayer } from '../../../components/player/MiniPlayer';

function getVideo(testId: string): HTMLVideoElement {
  const el = document.querySelector(`[data-testid="${testId}"]`);
  if (!el) throw new Error(`Elemento de vídeo "${testId}" não encontrado.`);
  return el as HTMLVideoElement;
}

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
  title: '1.1 Visão Geral e Comparação com Electron',
  subtitle: 'Arquitetura Desktop Moderna com Tauri & React',
  videoUrl: '/media/videos/big-buck-bunny.mp4',
  thumbnailUrl:
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80',
  duration: 596,
  initialTime: 120,
  onExpand: fn(),
  onClose: fn(),
};

/** Mini player de uma aula (pausado) — clique para expandir. */
export const LessonPaused: Story = {
  args: { ...baseArgs },
};

/** Mini player reproduzindo (continua depois de sair do player). */
export const LessonPlaying: Story = {
  args: { ...baseArgs },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    fireEvent(getVideo('mini-player-video'), new Event('playing'));
    await waitFor(() => expect(canvas.getByRole('button', { name: /^pausar$/i })).toBeTruthy());
    await waitFor(() => expect(canvas.getByText('Reproduzindo')).toBeTruthy());
  },
};

/** Variante de filme (destaque verde). */
export const Movie: Story = {
  args: {
    ...baseArgs,
    title: 'Interestelar',
    subtitle: 'Ficção Científica',
    videoUrl: '/media/videos/tears-of-steel.mp4',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=600&auto=format&fit=crop&q=80',
    duration: 734,
    initialTime: 300,
    accentColor: '#10B981',
  },
};

/** Mídia finalizada — oferece replay. */
export const Ended: Story = {
  args: { ...baseArgs, initialTime: 596 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: /reproduzir novamente/i })).toBeTruthy();
  },
};

/** Clicar no mini player expande de volta para a tela cheia. */
export const ExpandsOnClick: Story = {
  args: { ...baseArgs, onExpand: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByTestId('mini-player'));
    await expect(args.onExpand).toHaveBeenCalled();
  },
};

/** Botão de fechar encerra a sessão sem expandir. */
export const CloseButton: Story = {
  args: { ...baseArgs, onClose: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /fechar mini player/i }));
    await expect(args.onClose).toHaveBeenCalled();
  },
};
