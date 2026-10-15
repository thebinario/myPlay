import type { Meta, StoryObj } from '@storybook/react';
import { SearchResultCard } from '../../../components/search/SearchResultCard';
import type { SearchResult } from '../../../types/library';

const courseResult: SearchResult = {
  kind: 'course',
  itemId: 'course-1',
  title: 'Arquitetura Desktop Moderna com Tauri & React',
  context: 'Construa aplicações desktop performáticas com Tauri, React e TypeScript.',
  available: true,
  progressLabel: '42% concluído',
  coverUrl:
    'https://images.unsplash.com/photo-1517180102446-f3ece451e9d8?w=600&auto=format&fit=crop&q=80',
};

const lessonResult: SearchResult = {
  kind: 'lesson',
  itemId: 'les-1-2',
  lessonId: 'les-1-2',
  moduleId: 'mod-1',
  courseId: 'course-1',
  title: 'Configuração do Ambiente e Hot Reload',
  context: 'Arquitetura Desktop Moderna com Tauri & React • Módulo 1',
  available: true,
  progressLabel: 'Retomar em 3min',
};

const meta: Meta<typeof SearchResultCard> = {
  title: 'Search/SearchResultCard',
  component: SearchResultCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    background: { default: '#0D111B' },
  },
  argTypes: {
    onClick: { action: 'click' },
    result: { control: false },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '640px', background: '#0D111B' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SearchResultCard>;

export const Course: Story = {
  args: { result: courseResult, onClick: () => {} },
};

export const Lesson: Story = {
  args: { result: lessonResult, onClick: () => {} },
};

export const Unavailable: Story = {
  args: {
    result: { ...lessonResult, available: false },
    onClick: () => {},
  },
};
