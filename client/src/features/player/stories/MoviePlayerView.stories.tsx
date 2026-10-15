import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from 'storybook/test';
import { MoviePlayerView } from '../../../components/player/MoviePlayerView';
import { MOCK_MOVIES } from '../../../services/mockData';

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
  },
};

export default meta;
type Story = StoryObj<typeof MoviePlayerView>;

const defaultArgs = {
  movie: MOCK_MOVIES[1],
  onBack: () => {},
};

export const Default: Story = {
  args: {
    ...defaultArgs,
  },
};

export const WithProgress: Story = {
  args: {
    ...defaultArgs,
    movie: MOCK_MOVIES[0],
  },
};

export const Playing: Story = {
  args: {
    ...defaultArgs,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /reproduzir/i }));
    await expect(canvas.getByRole('button', { name: /pausar/i })).toBeTruthy();
  },
};

export const Muted: Story = {
  args: {
    ...defaultArgs,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /ativar mudo/i }));
    await expect(canvas.getByRole('button', { name: /desativar mudo/i })).toBeTruthy();
  },
};
