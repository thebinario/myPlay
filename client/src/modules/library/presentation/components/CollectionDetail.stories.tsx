import type { Meta, StoryObj } from '@storybook/react';
import { CollectionDetail } from '@/modules/library/presentation/components/CollectionDetail';
import { MOCK_COLLECTIONS } from '@/modules/library/infrastructure/mock-collections';

const meta: Meta<typeof CollectionDetail> = {
  title: 'Library/CollectionDetail',
  component: CollectionDetail,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    background: { default: '#0D111B' },
  },
  argTypes: {
    collection: { control: false },
    onBack: { action: 'back' },
    onSelectCourse: { action: 'select-course' },
    onPlayLesson: { action: 'play-lesson' },
    onOpenDocument: { action: 'open-document' },
  },
};

export default meta;
type Story = StoryObj<typeof CollectionDetail>;

const baseArgs = {
  backLabel: 'Voltar à biblioteca',
  onBack: () => {},
  onSelectCourse: () => {},
};

/** Coleção com vários cursos: grade de cards de curso. */
export const MultipleCourses: Story = {
  args: {
    ...baseArgs,
    collection: MOCK_COLLECTIONS[0],
  },
};

/** Coleção com um único curso: abre direto o conteúdo (módulos e aulas). */
export const SingleCourse: Story = {
  args: {
    ...baseArgs,
    collection: MOCK_COLLECTIONS[2],
  },
};
