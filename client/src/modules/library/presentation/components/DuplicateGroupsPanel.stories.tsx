import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from 'storybook/test';
import type { DuplicatesRepository } from '@/modules/library/domain/duplicates';
import { DuplicatesProvider } from '@/modules/library/presentation/DuplicatesProvider';
import { DuplicateGroupsPanel } from '@/modules/library/presentation/components/DuplicateGroupsPanel';

const lesson = (courseTitle: string, watchedRatio: number | null, completedAt: string | null) => ({
  lessonId: `${courseTitle}-l1`,
  lessonTitle: '01 - Introdução',
  courseId: courseTitle,
  courseTitle,
  watchedRatio,
  completedAt,
});

const withGroups: DuplicatesRepository = {
  listGroups: async () => [
    {
      kind: 'exact',
      members: [
        {
          mediaFileId: 'a',
          sourceId: 's',
          relativePath: 'React 2023/01 - Introdução.mp4',
          mediaType: 'video',
          fileSize: 1,
          durationMs: 600_000,
          lessons: [lesson('React 2023', 0.97, '2026-10-01T00:00:00Z')],
          documents: [],
        },
        {
          mediaFileId: 'b',
          sourceId: 's',
          relativePath: 'Pacote Front-end/React/01 - Introdução.mp4',
          mediaType: 'video',
          fileSize: 1,
          durationMs: 600_000,
          lessons: [lesson('Pacote Front-end', null, null)],
          documents: [],
        },
      ],
    },
    {
      kind: 'perceptual',
      members: [
        {
          mediaFileId: 'c',
          sourceId: 's',
          relativePath: 'Node 1080p/03 - Streams.mp4',
          mediaType: 'video',
          fileSize: 1,
          durationMs: 900_000,
          lessons: [lesson('Node 1080p', 0.42, null)],
          documents: [],
        },
        {
          mediaFileId: 'd',
          sourceId: 's',
          relativePath: 'Node 480p/03 - Streams.mp4',
          mediaType: 'video',
          fileSize: 1,
          durationMs: 901_000,
          lessons: [lesson('Node 480p', null, null)],
          documents: [],
        },
      ],
    },
  ],
  analysisStatus: async () => ({ pending: 12, analyzed: 340, failed: 1 }),
};

const meta: Meta<typeof DuplicateGroupsPanel> = {
  title: 'Library/DuplicateGroupsPanel',
  component: DuplicateGroupsPanel,
  tags: ['autodocs'],
  parameters: { background: { default: '#141A28' } },
};

export default meta;
type Story = StoryObj<typeof DuplicateGroupsPanel>;

/** Cópias idênticas e recodificadas, com o progresso de cada uma (read model do backend). */
export const WithGroups: Story = {
  decorators: [
    (Story) => (
      <DuplicatesProvider repository={withGroups}>
        <Story />
      </DuplicatesProvider>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findAllByTestId('duplicate-group')).toHaveLength(2);
  },
};

/** Biblioteca sem duplicatas. */
export const Empty: Story = {
  decorators: [
    (Story) => (
      <DuplicatesProvider repository={{ ...withGroups, listGroups: async () => [] }}>
        <Story />
      </DuplicatesProvider>
    ),
  ],
};
