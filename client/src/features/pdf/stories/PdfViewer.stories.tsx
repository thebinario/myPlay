import type { Meta, StoryObj } from '@storybook/react';
import { PdfViewer } from '../../components/pdf/PdfViewer';
import { mockLibraryService } from '../../services/mockData';
import { Document } from '../../types/library';

const mockDocument: Document = {
  id: 'doc-clean-architecture',
  type: 'document',
  title: 'Clean Architecture para Aplicações Frontend.pdf',
  description: 'Guia de desacoplamento, inversão de controle e estruturação de serviços independentes.',
  category: 'Livros',
  coverUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
  totalPages: 120,
  lastReadPage: 34,
  fileUrl: '/materials/clean-architecture.pdf',
  tags: ['Arquitetura', 'Clean Code'],
  createdAt: '2026-01-10T11:00:00Z',
};

const meta: Meta<typeof PdfViewer> = {
  title: 'PDF/PDFViewer',
  component: PdfViewer,
  tags: ['autodocs'],
  parameters: {
    controls: { sortBy: ['required', 'default'] },
    background: { default: '#0D111B' },
  },
  argTypes: {
    document: { control: false },
    onBack: { action: 'back' },
  },
};

export default meta;
type Story = StoryObj<typeof PdfViewer>;

export const Default: Story = {
  args: {
    document: mockDocument,
    onBack: () => {},
  },
};

export const LoadingState: Story = {
  parameters: {
    backgrounds: { default: 'custom' },
    background: {
      name: 'dark',
      value: '#0D111B',
    },
  },
  args: {
    document: mockDocument,
    onBack: () => {},
  },
};

export const ErrorState: Story = {
  parameters: {
    backgrounds: { default: 'custom' },
    background: {
      name: 'dark',
      value: '#0D111B',
    },
  },
  args: {
    document: {
      ...mockDocument,
      isUnavailable: true,
    },
    onBack: () => {},
  },
};