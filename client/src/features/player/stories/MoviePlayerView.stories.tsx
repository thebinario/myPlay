import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect, waitFor } from 'storybook/test';
import { MoviePlayerView } from '../../../components/player/MoviePlayerView';
import { MOCK_MOVIES } from '../../../services/mockData';
import { Movie } from '../../../types/library';

// Filme já assistido até o fim → inicia no estado "ended".
const finishedMovie: Movie = {
  ...MOCK_MOVIES[0],
  id: 'movie-finished',
  title: 'Filme finalizado (créditos)',
  progress: 100,
};

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
    loadingDelayMs: { control: { type: 'number' } },
    bufferingDelayMs: { control: { type: 'number' } },
    seekDelayMs: { control: { type: 'number' } },
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
  args: { ...baseArgs, loadingDelayMs: 0 },
};

/** Carregando a mídia. */
export const Loading: Story = {
  args: { ...baseArgs, loadingDelayMs: 600000 },
};

/** Reproduzindo. */
export const Playing: Story = {
  args: { ...baseArgs, loadingDelayMs: 0, bufferingDelayMs: 60 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /reproduzir/i }));
    await canvas.findByRole('button', { name: /pausar/i });
    await waitFor(() => expect(canvas.getByTestId('movie-status').textContent).toBe('Reproduzindo'));
  },
};

/** Armazenando em buffer. */
export const Buffering: Story = {
  args: { ...baseArgs, loadingDelayMs: 0, bufferingDelayMs: 600000 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /reproduzir/i }));
    await expect(canvas.getByTestId('movie-buffering')).toBeTruthy();
    await expect(canvas.getByTestId('movie-status').textContent).toBe('Armazenando');
  },
};

/** Mudo ativado pelo usuário. */
export const Muted: Story = {
  args: { ...baseArgs, loadingDelayMs: 0 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /ativar mudo/i }));
    await expect(canvas.getByRole('button', { name: /desativar mudo/i })).toBeTruthy();
  },
};

/** Fim do filme com opção de replay. */
export const Ended: Story = {
  args: { ...baseArgs, movie: finishedMovie, loadingDelayMs: 0 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('movie-ended')).toBeTruthy();
    await expect(canvas.getByTestId('movie-status').textContent).toBe('Finalizado');
  },
};
