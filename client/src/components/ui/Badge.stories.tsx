import type { Meta, StoryObj } from '@storybook/react';
import { BookOpen } from 'lucide-react';
import { Badge } from './Badge';

const meta: Meta<typeof Badge> = {
  title: 'UI/Badge',
  component: Badge,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    background: { default: '#0D111B' },
  },
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'success', 'warning', 'error', 'violet'],
    },
    size: { control: { type: 'radio' }, options: ['sm', 'md', 'lg'] },
    children: { control: 'text' },
  },
  args: {
    children: '3',
    variant: 'default',
    size: 'md',
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {};

export const Success: Story = {
  args: { variant: 'success' },
};

export const Warning: Story = {
  args: { variant: 'warning' },
};

export const Error: Story = {
  args: { variant: 'error' },
};

export const Violet: Story = {
  args: { variant: 'violet' },
};

export const Small: Story = {
  args: { size: 'sm' },
};

export const Large: Story = {
  args: { size: 'lg' },
};

export const WithIcon: Story = {
  args: {
    variant: 'violet',
    children: <BookOpen size={18} color="#0D111B" strokeWidth={2.5} />,
  },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
      <Badge variant="default">1</Badge>
      <Badge variant="success">2</Badge>
      <Badge variant="warning">3</Badge>
      <Badge variant="error">4</Badge>
      <Badge variant="violet">5</Badge>
    </div>
  ),
};
