import type { Meta, StoryObj } from '@storybook/react';
import { SectionHeader } from './SectionHeader';

const meta: Meta<typeof SectionHeader> = {
  title: 'UI/SectionHeader',
  component: SectionHeader,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    background: { default: '#0D111B' },
  },
  argTypes: {
    title: { control: 'text' },
    subtitle: { control: 'text' },
    className: { control: false },
  },
  args: {
    title: 'Continuar assistindo',
    subtitle: 'Cursos em andamento',
  },
};

export default meta;
type Story = StoryObj<typeof SectionHeader>;

export const Default: Story = {};

export const TitleOnly: Story = {
  args: { subtitle: undefined },
};
