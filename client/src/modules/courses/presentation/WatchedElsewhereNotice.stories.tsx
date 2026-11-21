import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from 'storybook/test';
import { WatchedElsewhereNotice } from '@/modules/courses/presentation/WatchedElsewhereNotice';

const watched = {
  lessonId: 'les-old',
  lessonTitle: 'Introdução',
  courseId: 'course-old',
  courseTitle: 'React Essencial (2023)',
  watchedRatio: 0.96,
  completedAt: '2026-10-01T00:00:00Z',
};

const meta: Meta<typeof WatchedElsewhereNotice> = {
  title: 'Courses/WatchedElsewhereNotice',
  component: WatchedElsewhereNotice,
  tags: ['autodocs'],
  parameters: { background: { default: '#0D111B' } },
  args: { onMarkAsWatched: fn() },
};

export default meta;
type Story = StoryObj<typeof WatchedElsewhereNotice>;

/** Mesmo conteúdo já assistido em outro curso: oferece reaproveitar a conclusão. */
export const AlreadyWatched: Story = {
  args: { watchedElsewhere: watched },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Marcar como vista' }));
    await expect(args.onMarkAsWatched).toHaveBeenCalledWith('les-old');
  },
};

/** Duplicata em andamento em outro curso: só informa, sem ação. */
export const InProgressElsewhere: Story = {
  args: { watchedElsewhere: { ...watched, watchedRatio: 0.4, completedAt: null } },
};
