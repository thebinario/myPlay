import type { Meta, StoryObj } from '@storybook/react';
import { CourseEditorView } from '@/modules/courses/presentation/CourseEditorView';
import { MOCK_COURSES } from '@/modules/library/infrastructure/mock-library-repository';
import { Course } from '@/core/domain/library';

const baseCourse = MOCK_COURSES[0];

const singleModuleCourse: Course = {
  ...baseCourse,
  id: 'course-single-module',
  title: 'Curso com um único módulo',
  modules: baseCourse.modules.slice(0, 1),
};

const meta: Meta<typeof CourseEditorView> = {
  title: 'Editor/CourseEditorView',
  component: CourseEditorView,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    controls: { sortBy: ['required', 'default'] },
    background: { default: '#0D111B' },
  },
  argTypes: {
    initialCourse: { control: false },
    onSave: { action: 'save' },
    onBack: { action: 'back' },
  },
};

export default meta;
type Story = StoryObj<typeof CourseEditorView>;

const defaultArgs = {
  initialCourse: baseCourse,
  onSave: () => {},
  onBack: () => {},
};

export const Default: Story = {
  args: {
    ...defaultArgs,
  },
};

export const SingleModule: Story = {
  args: {
    ...defaultArgs,
    initialCourse: singleModuleCourse,
  },
};
