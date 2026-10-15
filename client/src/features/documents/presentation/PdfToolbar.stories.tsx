import type { Meta, StoryObj } from '@storybook/react';
import { PdfToolbar } from '@/features/documents/presentation/PdfToolbar';

const meta: Meta<typeof PdfToolbar> = {
  title: 'PDF/PdfToolbar',
  component: PdfToolbar,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    background: { default: '#0D111B' },
  },
  argTypes: {
    onBack: { action: 'back' },
    onPrevPage: { action: 'prev' },
    onNextPage: { action: 'next' },
    onZoomIn: { action: 'zoomIn' },
    onZoomOut: { action: 'zoomOut' },
    onToggleColorMode: { action: 'toggleColorMode' },
  },
};

export default meta;
type Story = StoryObj<typeof PdfToolbar>;

const baseArgs: Partial<React.ComponentProps<typeof PdfToolbar>> = {
  title: 'Clean Architecture para Aplicações Frontend.pdf',
  currentPage: 34,
  totalPages: 120,
  zoom: 1,
  onBack: () => {},
  onPrevPage: () => {},
  onNextPage: () => {},
  onZoomIn: () => {},
  onZoomOut: () => {},
  onToggleColorMode: () => {},
};

export const DarkMode: Story = {
  args: { ...baseArgs, colorMode: 'dark', isUnavailable: false },
};

export const OriginalColors: Story = {
  args: { ...baseArgs, colorMode: 'original', isUnavailable: false },
};

export const Unavailable: Story = {
  args: { ...baseArgs, colorMode: 'dark', isUnavailable: true },
};
