import type { Meta, StoryObj } from '@storybook/react';
import { Sidebar } from '@/features/home/presentation/Sidebar';

const meta: Meta<typeof Sidebar> = {
  title: 'Components/Sidebar (Composed)',
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

export const DefaultWithActiveLibrary: Story = {
  args: {
    currentTab: 'library',
    onNavigate: () => {},
  },
};

export const DefaultWithActivePlayer: Story = {
  args: {
    currentTab: 'player',
    onNavigate: () => {},
  },
};

export const FullNavigation: Story = {
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
