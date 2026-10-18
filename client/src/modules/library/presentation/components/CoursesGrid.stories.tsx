import type { Meta, StoryObj } from '@storybook/react';
import { CoursesGrid } from '@/modules/library/presentation/components/CoursesGrid';
import { MOCK_COURSES } from '@/modules/library/infrastructure/mock-library-repository';
import { MOCK_COLLECTION_COURSES } from '@/modules/library/infrastructure/mock-collections';

const meta: Meta<typeof CoursesGrid> = {
  title: 'Library/CoursesGrid',
  component: CoursesGrid,
  tags: ['autodocs'],
  parameters: {
    background: { default: '#0D111B' },
    layout: 'fullscreen',
  },
  argTypes: {
    courses: { control: false },
    onSelectCourse: { action: 'select-course' },
  },
  decorators: [
    (Story) => (
      <div style={{ padding: 32, maxWidth: 960 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CoursesGrid>;

export const Default: Story = {
  args: {
    courses: MOCK_COURSES,
    onSelectCourse: () => {},
  },
};

export const Variados: Story = {
  args: {
    courses: MOCK_COLLECTION_COURSES,
    onSelectCourse: () => {},
  },
};

export const CursoUnico: Story = {
  args: {
    courses: MOCK_COLLECTION_COURSES.filter((course) => course.id === 'course-unico'),
    onSelectCourse: () => {},
  },
};

export const Empty: Story = {
  args: {
    courses: [],
    onSelectCourse: () => {},
  },
};
