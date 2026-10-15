import type { Meta, StoryObj } from '@storybook/react';
import { SearchView } from '../../search/SearchView';
import { mockLibraryService } from '../../services/mockData';

const meta: Meta<typeof SearchView> = {
  title: 'Search/SearchView',
  component: SearchView,
  tags: ['autodocs'],
  parameters: {
    controls: { sortBy: ['required', 'default'] },
    background: { default: '#0D111B' },
  },
  argTypes: {
    onNavigate: { action: 'navigate' },
    onSelect: { action: 'select' },
  },
};

export default meta;
type Story = StoryObj<typeof SearchView>;

export const Default: Story = {
  args: {
    onNavigate: () => {},
    onSelect: () => {},
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
    onNavigate: () => {},
    onSelect: () => {},
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
    onNavigate: () => {},
    onSelect: () => {},
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
    onNavigate: () => {},
    onSelect: () => {},
  },
};