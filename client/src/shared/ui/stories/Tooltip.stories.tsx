import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from 'storybook/test';
import { Tooltip } from '@/shared/ui/components/Tooltip';

const meta: Meta<typeof Tooltip> = {
  title: 'UI/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    background: { default: '#0D111B' },
  },
  argTypes: {
    text: { control: 'text' },
    placement: { control: { type: 'radio' }, options: ['top', 'bottom', 'left', 'right'] },
    delay: { control: { type: 'number' } },
    children: { control: false },
  },
  args: {
    text: 'Texto de ajuda',
    placement: 'top',
    delay: 0,
  },
  render: (args) => (
    <Tooltip {...args}>
      <button
        style={{
          padding: '8px 16px',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(255, 255, 255, 0.06)',
          color: '#F8FAFC',
          cursor: 'pointer',
        }}
      >
        Passe o mouse
      </button>
    </Tooltip>
  ),
};

export default meta;
type Story = StoryObj<typeof Tooltip>;

export const Top: Story = {};

export const Bottom: Story = {
  args: { placement: 'bottom' },
};

export const Left: Story = {
  args: { placement: 'left' },
};

export const Right: Story = {
  args: { placement: 'right' },
};

export const Hover: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.hover(canvas.getByRole('button', { name: /passe o mouse/i }));
    await expect(await canvas.findByText('Texto de ajuda')).toBeTruthy();
  },
};
