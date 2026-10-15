import type { Meta, StoryObj } from '@storybook/react';
import { HomeView } from '../../../components/home/HomeView';
import { MOCK_COURSES, MOCK_MOVIES, MOCK_DOCUMENTS } from '../../../services/mockData';

const meta: Meta<typeof HomeView> = {
  title: 'Home/HomeView',
  component: HomeView,
  tags: ['autodocs'],
  parameters: {
    controls: { sortBy: ['required', 'default'] },
    background: { default: '#0D111B' },
  },
  argTypes: {
    courses: { control: false },
    movies: { control: false },
    documents: { control: false },
    onSelectCourse: { action: 'select-course' },
    onOpenMovie: { action: 'open-movie' },
    onOpenDocument: { action: 'open-document' },
    onExploreLibrary: { action: 'explore-library' },
    onSearchOpen: { action: 'search-open' },
  },
};

export default meta;
type Story = StoryObj<typeof HomeView>;

const defaultArgs = {
  courses: MOCK_COURSES,
  movies: MOCK_MOVIES,
  documents: MOCK_DOCUMENTS,
  onSelectCourse: () => {},
  onExploreLibrary: () => {},
};

export const Default: Story = {
  args: {
    ...defaultArgs,
  },
};

export const WithProgress: Story = {
  parameters: {
    backgrounds: { default: 'custom' },
    background: {
      name: 'dark',
      value: '#0D111B',
    },
  },
  args: {
    ...defaultArgs,
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
    courses: [],
    movies: [],
    documents: [],
  },
};
