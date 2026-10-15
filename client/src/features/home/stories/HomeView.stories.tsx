import type { Meta, StoryObj } from '@storybook/react';
import { HomeView } from '../../home/HomeView';
import { mockLibraryService } from '../../services/mockData';

const meta: Meta<typeof HomeView> = {
  title: 'Home/HomeView',
  component: HomeView,
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
type Story = StoryObj<typeof HomeView>;

export const Default: Story = {
  args: {
    onNavigate: () => {},
    onSelect: () => {},
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