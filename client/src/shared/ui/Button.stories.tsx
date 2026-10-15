import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '@/shared/ui/Button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    background: { default: '#0D111B' },
  },
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'secondary', 'ghost', 'violet', 'danger'],
    },
    size: { control: { type: 'radio' }, options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
    children: { control: 'text' },
  },
  args: {
    children: 'Botão',
    variant: 'default',
    size: 'md',
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {};

export const Secondary: Story = {
  args: { variant: 'secondary' },
};

export const Ghost: Story = {
  args: { variant: 'ghost' },
};

export const Violet: Story = {
  args: { variant: 'violet' },
};

export const Danger: Story = {
  args: { variant: 'danger' },
};

export const Small: Story = {
  args: { size: 'sm' },
};

export const Large: Story = {
  args: { size: 'lg' },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
      <Button variant="default">Default</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="violet">Violet</Button>
      <Button variant="danger">Danger</Button>
    </div>
  ),
};
