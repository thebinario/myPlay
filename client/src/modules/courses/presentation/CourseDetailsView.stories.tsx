import type { Meta, StoryObj } from '@storybook/react';
import { CourseDetailsView } from '@/modules/courses/presentation/CourseDetailsView';
import { MOCK_COURSES } from '@/modules/library/infrastructure/mock-library-repository';
import { MOCK_COLLECTION_COURSES } from '@/modules/library/infrastructure/mock-collections';
import { Course } from '@/core/domain/library';

const baseCourse = MOCK_COURSES[0];

const emptyCourse: Course = {
  ...baseCourse,
  id: 'course-empty',
  title: 'Curso sem módulos',
  description: 'Exemplo de curso ainda sem conteúdo cadastrado.',
  modules: [],
  totalDuration: 0,
  progress: 0,
};

const completedCourse: Course = {
  ...baseCourse,
  id: 'course-completed',
  title: 'Curso 100% concluído',
  progress: 100,
  modules: baseCourse.modules.map((module) => ({
    ...module,
    lessons: module.lessons.map((lesson) => ({ ...lesson, completed: true })),
  })),
};

const meta: Meta<typeof CourseDetailsView> = {
  title: 'Course/CourseDetailsView',
  component: CourseDetailsView,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    controls: { sortBy: ['required', 'default'] },
    background: { default: '#0D111B' },
  },
  argTypes: {
    course: { control: false },
    onBack: { action: 'back' },
    onToggleLesson: { action: 'toggle-lesson' },
    onPlayLesson: { action: 'play-lesson' },
    onOpenMaterial: { action: 'open-material' },
    onOpenDocument: { action: 'open-document' },
    onToggleDocumentRead: { action: 'toggle-document-read' },
    onEditCourse: { action: 'edit-course' },
  },
};

export default meta;
type Story = StoryObj<typeof CourseDetailsView>;

const defaultArgs = {
  course: baseCourse,
  onBack: () => {},
  onToggleLesson: () => {},
};

export const Default: Story = {
  args: {
    ...defaultArgs,
  },
};

export const NoModules: Story = {
  args: {
    ...defaultArgs,
    course: emptyCourse,
  },
};

export const FullyCompleted: Story = {
  args: {
    ...defaultArgs,
    course: completedCourse,
  },
};

/** Curso com seções: os módulos aparecem agrupados sob cada seção. */
export const ComSecoes: Story = {
  args: {
    ...defaultArgs,
    course: MOCK_COLLECTION_COURSES.find((course) => course.id === 'course-unico')!,
  },
};
