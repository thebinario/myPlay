import type { Meta, StoryObj } from '@storybook/react';
import { SearchView } from '@/features/search/presentation/SearchView';

const meta: Meta<typeof SearchView> = {
  title: 'Search/SearchView',
  component: SearchView,
  tags: ['autodocs'],
  parameters: {
    controls: { sortBy: ['required', 'default'] },
    background: { default: '#0D111B' },
  },
  argTypes: {
    initialQuery: { control: { type: 'text' } },
    onOpenCourse: { action: 'open-course' },
    onOpenLesson: { action: 'open-lesson' },
    onOpenMovie: { action: 'open-movie' },
    onOpenDocument: { action: 'open-document' },
  },
};

export default meta;
type Story = StoryObj<typeof SearchView>;

const defaultArgs = {
  onOpenCourse: () => {},
  onOpenLesson: () => {},
  onOpenMovie: () => {},
  onOpenDocument: () => {},
};

export const Default: Story = {
  args: {
    ...defaultArgs,
  },
};

export const WithCourses: Story = {
  parameters: {
    backgrounds: { default: 'custom' },
    background: {
      name: 'dark',
      value: '#0D111B',
    },
  },
  args: {
    ...defaultArgs,
    initialQuery: 'React',
  },
};

export const WithMovies: Story = {
  parameters: {
    backgrounds: { default: 'custom' },
    background: {
      name: 'dark',
      value: '#0D111B',
    },
  },
  args: {
    ...defaultArgs,
    initialQuery: 'Código',
  },
};

export const EmptyState: Story = {
  parameters: {
    backgrounds: { default: 'custom' },
    background: {
      name: 'dark',
      value: '#0D111B',
    },
  },
  args: {
    ...defaultArgs,
    initialQuery: 'resultado-inexistente',
  },
};
