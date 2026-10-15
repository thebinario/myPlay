import type { Meta, StoryObj } from '@storybook/react';
import { LibraryView } from '../../../components/library/LibraryView';
import { mockLibraryService } from '../../../services/mockData';

const meta: Meta<typeof LibraryView> = {
  title: 'Library/LibraryView',
  component: LibraryView,
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
type Story = StoryObj<typeof LibraryView>;

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

export const WithDocuments: Story = {
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