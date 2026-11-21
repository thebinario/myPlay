import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from 'storybook/test';
import { LessonWatchBadge } from '@/modules/courses/presentation/LessonWatchBadge';

const meta: Meta<typeof LessonWatchBadge> = {
  title: 'Courses/LessonWatchBadge',
  component: LessonWatchBadge,
  tags: ['autodocs'],
  parameters: { background: { default: '#0D111B' } },
};

export default meta;
type Story = StoryObj<typeof LessonWatchBadge>;

/** Aula em andamento: cobertura real informada pelo backend. */
export const PartiallyWatched: Story = {
  args: { watchedRatio: 0.62, completed: false, completionSource: null },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByTestId('lesson-watch-badge').textContent).toBe(
      'Assistido 62%',
    );
  },
};

/** Conclusão marcada manualmente, sem cobertura suficiente. */
export const ManualCompletion: Story = {
  args: { watchedRatio: 0.1, completed: true, completionSource: 'manual' },
};

/** Concluída por ser a mesma mídia de uma aula já vista em outro curso. */
export const DuplicateCompletion: Story = {
  args: { watchedRatio: 0, completed: true, completionSource: 'duplicate' },
};
