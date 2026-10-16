import type { Meta, StoryObj } from '@storybook/react';
import { LibraryView } from '@/modules/library/presentation/LibraryView';
import {
  MOCK_LIBRARY,
  MOCK_COURSES,
  MOCK_MOVIES,
  MOCK_DOCUMENTS,
} from '@/modules/library/infrastructure/mock-library-repository';
import type { LibrarySource } from '@/core/domain/library-source';

const storySource: LibrarySource = {
  id: 'storybook-library',
  path: '/biblioteca/demo',
  name: 'Biblioteca de demonstração',
  libraryType: 'course',
  status: 'connected',
  itemCount: MOCK_LIBRARY.length,
  lastScannedAt: null,
};

const meta: Meta<typeof LibraryView> = {
  title: 'Library/LibraryView',
  component: LibraryView,
  tags: ['autodocs'],
  parameters: {
    controls: { sortBy: ['required', 'default'] },
    background: { default: '#0D111B' },
  },
  argTypes: {
    items: { control: false },
    sources: { control: false },
    onSelectCourse: { action: 'select-course' },
    onPlayLesson: { action: 'play-lesson' },
    onOpenMovie: { action: 'open-movie' },
    onOpenDocument: { action: 'open-document' },
  },
};

export default meta;
type Story = StoryObj<typeof LibraryView>;

const defaultArgs = {
  items: MOCK_LIBRARY,
  onSelectCourse: () => {},
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
    items: MOCK_COURSES,
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
    items: MOCK_MOVIES,
  },
};

export const WithDocuments: Story = {
  parameters: {
    backgrounds: { default: 'custom' },
    background: {
      name: 'dark',
      value: '#0D111B',
    },
  },
  args: {
    ...defaultArgs,
    items: MOCK_DOCUMENTS,
  },
};

export const WithSources: Story = {
  args: {
    ...defaultArgs,
    sources: [storySource],
    items: MOCK_LIBRARY.map((item) => ({ ...item, sourceId: storySource.id })),
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
    items: [],
  },
};
