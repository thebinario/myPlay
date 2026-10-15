import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect, waitFor, fireEvent } from 'storybook/test';
import { MoviePlayerView } from '@/features/player/presentation/MoviePlayerView';
import { MOCK_MOVIES } from '@/features/library/infrastructure/mockLibraryRepository';
import { Movie } from '@/core/domain/library';

// Filme já assistido até o fim → inicia no estado "ended".
const finishedMovie: Movie = {
  ...MOCK_MOVIES[0],
  id: 'movie-finished',
  title: 'Filme finalizado (créditos)',
  progress: 100,
};

function getVideo(testId: string): HTMLVideoElement {
  const el = document.querySelector(`[data-testid="${testId}"]`);
  if (!el) throw new Error(`Elemento de vídeo "${testId}" não encontrado.`);
  return el as HTMLVideoElement;
}

const meta: Meta<typeof MoviePlayerView> = {
  title: 'Player/MoviePlayerView',
  component: MoviePlayerView,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    controls: { sortBy: ['required', 'default'] },
    background: { default: '#0D111B' },
  },
  decorators: [
    (Story) => (
      <div style={{ height: '100vh', width: '100%' }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    movie: { control: false },
    onBack: { action: 'back' },
    controlsAutoHideDelayMs: { control: { type: 'number' } },
  },
};

export default meta;
type Story = StoryObj<typeof MoviePlayerView>;

const baseArgs = {
  movie: MOCK_MOVIES[0],
  onBack: () => {},
};

/** Mídia pronta, retomando de 30% de progresso. */
export const Ready: Story = {
  args: { ...baseArgs },
};

/** Carregando a mídia. */
export const Loading: Story = {
  args: { ...baseArgs },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const video = getVideo('movie-video');
    Object.defineProperty(video, 'readyState', { configurable: true, get: () => 0 });
    fireEvent(video, new Event('loadstart'));
    await expect(canvas.getByTestId('movie-loading')).toBeTruthy();
    await waitFor(() => expect(canvas.getByTestId('movie-status').textContent).toBe('Carregando'));
  },
};

/** Reproduzindo. */
export const Playing: Story = {
  args: { ...baseArgs },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    fireEvent(getVideo('movie-video'), new Event('playing'));
    await canvas.findByRole('button', { name: /pausar/i });
    await waitFor(() =>
      expect(canvas.getByTestId('movie-status').textContent).toBe('Reproduzindo'),
    );
  },
};

/** Controles se auto-ocultam durante a reprodução e reaparecem ao mover o mouse. */
export const ControlsAutoHide: Story = {
  args: { ...baseArgs, controlsAutoHideDelayMs: 150 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    fireEvent(getVideo('movie-video'), new Event('play'));
    await waitFor(() => expect(canvas.getByTestId('movie-controls').style.opacity).toBe('0'), {
      timeout: 5000,
    });
    fireEvent.mouseMove(canvas.getByTestId('movie-player-canvas'));
    await waitFor(() => expect(canvas.getByTestId('movie-controls').style.opacity).toBe('1'));
  },
};

/** Armazenando em buffer. */
export const Buffering: Story = {
  args: { ...baseArgs },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const video = getVideo('movie-video');
    fireEvent(video, new Event('play'));
    fireEvent(video, new Event('waiting'));
    await expect(canvas.getByTestId('movie-buffering')).toBeTruthy();
    await waitFor(() => expect(canvas.getByTestId('movie-status').textContent).toBe('Armazenando'));
  },
};

/** Mudo ativado pelo usuário. */
export const Muted: Story = {
  args: { ...baseArgs },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /ativar mudo/i }));
    await expect(canvas.getByRole('button', { name: /desativar mudo/i })).toBeTruthy();
  },
};

/** Fim do filme com opção de replay. */
export const Ended: Story = {
  args: { ...baseArgs, movie: finishedMovie },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('movie-ended')).toBeTruthy();
    await expect(canvas.getByTestId('movie-status').textContent).toBe('Finalizado');
  },
};
