import type { Meta, StoryObj } from '@storybook/react';
import { Play, Pause, X } from 'lucide-react';
import { IconButton } from '@/shared/ui/IconButton';

const meta: Meta<typeof IconButton> = {
  title: 'UI/IconButton',
  component: IconButton,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    background: { default: '#0D111B' },
  },
  argTypes: {
    icon: { control: false },
    variant: { control: { type: 'select' }, options: ['default', 'violet', 'muted'] },
    size: { control: { type: 'number' } },
    color: { control: { type: 'color' } },
    disabled: { control: 'boolean' },
    children: { control: 'text' },
  },
  args: {
    icon: Play,
    size: 18,
    color: '#94A3B8',
    variant: 'muted',
  },
};

export default meta;
type Story = StoryObj<typeof IconButton>;

export const Default: Story = {};

export const Violet: Story = {
  args: { variant: 'violet', icon: Pause },
};

export const Muted: Story = {
  args: { variant: 'muted', icon: X },
};

export const WithLabel: Story = {
  args: { variant: 'default', children: 'Reproduzir' },
};

export const Disabled: Story = {
  args: { disabled: true },
};
