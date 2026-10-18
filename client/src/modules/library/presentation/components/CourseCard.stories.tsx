import type { Meta, StoryObj } from '@storybook/react';
import { CourseCard } from '@/modules/library/presentation/components/CourseCard';
import { MOCK_COURSES } from '@/modules/library/infrastructure/mock-library-repository';
import { MOCK_COLLECTION_COURSES } from '@/modules/library/infrastructure/mock-collections';

const meta: Meta<typeof CourseCard> = {
  title: 'Library/CourseCard',
  component: CourseCard,
  tags: ['autodocs'],
  parameters: {
    background: { default: '#0D111B' },
    layout: 'centered',
  },
  argTypes: {
    course: { control: false },
    onSelect: { action: 'select-course' },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 280 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CourseCard>;

export const Default: Story = {
  args: {
    course: MOCK_COURSES[0],
    onSelect: () => {},
  },
};

const byId = (id: string) => MOCK_COLLECTION_COURSES.find((course) => course.id === id)!;

/** Curso com seções e módulos (estrutura aninhada completa). */
export const ComSecoes: Story = {
  args: {
    course: byId('course-unico'),
    onSelect: () => {},
  },
};

/** Curso sem seções: módulos direto sob o curso. */
export const SemSecoes: Story = {
  args: {
    course: byId('course-sem-secao'),
    onSelect: () => {},
  },
};

/** Curso só com PDFs (sem vídeos): 0 aulas e progresso de leitura. */
export const SoPdf: Story = {
  args: {
    course: byId('course-so-pdf'),
    onSelect: () => {},
  },
};
