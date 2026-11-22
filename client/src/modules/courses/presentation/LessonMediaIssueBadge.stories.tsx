import type { Meta, StoryObj } from '@storybook/react';
import { LessonMediaIssueBadge } from '@/modules/courses/presentation/LessonMediaIssueBadge';

const meta: Meta<typeof LessonMediaIssueBadge> = {
  title: 'Courses/LessonMediaIssueBadge',
  component: LessonMediaIssueBadge,
  tags: ['autodocs'],
  parameters: { backgrounds: { default: 'dark' } },
};

export default meta;
type Story = StoryObj<typeof LessonMediaIssueBadge>;

/** Núcleo não conseguiu ler o arquivo (download/cópia incompletos). */
export const Damaged: Story = {
  args: { playability: 'damaged', reason: 'Invalid data found when processing input' },
};

/** Arquivo legível, mas com codec que o reprodutor não decodifica. */
export const Unsupported: Story = {
  args: { playability: 'unsupported', reason: 'codec de vídeo hevc' },
};

/** Reproduzível ou ainda não verificado: nada é exibido. */
export const Playable: Story = { args: { playability: 'playable' } };
