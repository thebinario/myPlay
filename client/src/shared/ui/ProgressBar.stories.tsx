import type { Meta, StoryObj } from '@storybook/react';
import { ProgressBar } from '@/shared/ui/ProgressBar';

const meta: Meta<typeof ProgressBar> = {
  title: 'UI/ProgressBar',
  component: ProgressBar,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    background: { default: '#0D111B' },
  },
  argTypes: {
    value: { control: { type: 'range', min: 0, max: 100, step: 1 } },
    max: { control: { type: 'number' } },
    width: { control: { type: 'text' } },
    height: { control: { type: 'text' } },
    bgColor: { control: { type: 'color' } },
    progressColor: { control: { type: 'color' } },
  },
  args: {
    value: 45,
  },
  decorators: [
    (Story) => (
      <div style={{ width: '320px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ProgressBar>;

export const Default: Story = {};

export const Empty: Story = {
  args: { value: 0 },
};

export const Complete: Story = {
  args: { value: 100 },
};

export const Thick: Story = {
  args: { height: '12px' },
};

export const CustomColors: Story = {
  args: { value: 72, progressColor: '#10B981', bgColor: 'rgba(16, 185, 129, 0.15)' },
};

export const CustomMax: Story = {
  args: { value: 3, max: 4 },
};
