import type { Meta, StoryObj } from '@storybook/react';
import { Sidebar } from '@/features/home/presentation/Sidebar';

const meta: Meta<typeof Sidebar> = {
  title: 'Components/Sidebar',
  component: Sidebar,
  tags: ['autodocs'],
  parameters: {
    controls: { sortBy: ['required', 'default'] },
    background: { default: '#0D111B' },
  },
  argTypes: {
    currentTab: {
      control: {
        type: 'radio',
        options: [
          'home',
          'library',
          'course-details',
          'player',
          'search',
          'settings',
          'editor',
          'pdf-viewer',
        ],
      },
    },
    onNavigate: { action: 'navigate' },
  },
};

export default meta;
type Story = StoryObj<typeof Sidebar>;

export const Default: Story = {
  args: {
    currentTab: 'home',
    onNavigate: () => {},
  },
};

export const LibraryTab: Story = {
  args: {
    currentTab: 'library',
    onNavigate: () => {},
  },
};

export const PlayerTab: Story = {
  args: {
    currentTab: 'player',
    onNavigate: () => {},
  },
};

export const SearchTab: Story = {
  args: {
    currentTab: 'search',
    onNavigate: () => {},
  },
};

export const SettingsTab: Story = {
  args: {
    currentTab: 'settings',
    onNavigate: () => {},
  },
};

export const DarkState: Story = {
  parameters: {
    backgrounds: { default: 'custom' },
    background: {
      name: 'dark',
      value: '#0D111B',
    },
  },
  args: {
    currentTab: 'home',
    onNavigate: () => {},
  },
};

export const HoverState: Story = {
  parameters: {
    backgrounds: { default: 'custom' },
    background: {
      name: 'dark',
      value: '#0D111B',
    },
  },
  args: {
    currentTab: 'home',
    onNavigate: () => {},
  },
};

export const DisabledState: Story = {
  parameters: {
    backgrounds: { default: 'custom' },
    background: {
      name: 'dark',
      value: '#0D111B',
    },
  },
  args: {
    currentTab: 'home',
    onNavigate: () => {},
  },
};
