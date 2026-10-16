import type { Meta, StoryObj } from '@storybook/react';
import { EditableLessonRow } from '@/modules/courses/presentation/EditableLessonRow';
import type { Lesson } from '@/core/domain/library';

const lesson: Lesson = {
  id: 'les-1-1',
  moduleId: 'mod-1',
  title: '1.1 Visão Geral e Comparação com Electron',
  duration: 596,
  completed: false,
  videoUrl: '/media/videos/big-buck-bunny.mp4',
  order: 1,
  materials: [],
  lastPlaybackPosition: 120,
};

const modules = [
  { id: 'mod-1', title: 'Módulo 1: Fundamentos e Arquitetura' },
  { id: 'mod-2', title: 'Módulo 2: Interface Minimalista e Design System' },
];

const meta: Meta<typeof EditableLessonRow> = {
  title: 'Editor/EditableLessonRow',
  component: EditableLessonRow,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    background: { default: '#141A28' },
  },
  argTypes: {
    lesson: { control: false },
    modules: { control: false },
    onTitleChange: { action: 'titleChange' },
    onMoveToModule: { action: 'moveToModule' },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '720px', background: '#141A28', padding: '16px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof EditableLessonRow>;

export const Default: Story = {
  args: {
    lesson,
    index: 0,
    moduleId: 'mod-1',
    modules,
    onTitleChange: () => {},
    onMoveToModule: () => {},
  },
};
