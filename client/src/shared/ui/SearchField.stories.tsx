import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect, fn } from 'storybook/test';
import { SearchField } from '@/shared/ui/SearchField';

const meta: Meta<typeof SearchField> = {
  title: 'UI/SearchField',
  component: SearchField,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    background: { default: '#0D111B' },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '320px' }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    placeholder: { control: 'text' },
    disabled: { control: 'boolean' },
    onChange: { action: 'change' },
    onClear: { action: 'clear' },
  },
  args: {
    onChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof SearchField>;

export const Default: Story = {};

export const CustomPlaceholder: Story = {
  args: { placeholder: 'Buscar aulas...' },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const WithClearButton: Story = {
  args: {
    onClear: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('textbox') as HTMLInputElement;
    await userEvent.type(input, 'Tauri');
    await expect(input.value).toBe('Tauri');
    await expect(canvas.getByRole('button')).toBeTruthy();
  },
};
