import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from 'storybook/test';
import { LessonTranscriptBadge } from '@/modules/courses/presentation/LessonTranscriptBadge';

const meta: Meta<typeof LessonTranscriptBadge> = {
  title: 'Courses/LessonTranscriptBadge',
  component: LessonTranscriptBadge,
  tags: ['autodocs'],
  parameters: { backgrounds: { default: 'dark' } },
};

export default meta;
type Story = StoryObj<typeof LessonTranscriptBadge>;

/** Transcrição concluída: o texto já está na busca e serve de legenda. */
export const Transcribed: Story = { args: { transcription: 'transcribed' } };

/** Em andamento (inclui retomada após uma falha temporária). */
export const Transcribing: Story = { args: { transcription: 'transcribing' } };

/** Falhou: o motivo real do erro fica no tooltip, para diagnóstico. */
export const Failed: Story = {
  args: {
    transcription: 'failed',
    error: 'Áudio ilegível: Invalid data found when processing input',
  },
  play: async ({ canvasElement }) => {
    const badge = within(canvasElement).getByTestId('lesson-transcript');
    await expect(badge).toHaveAttribute(
      'title',
      'Falha na transcrição: Áudio ilegível: Invalid data found when processing input',
    );
  },
};

/** Ainda não transcrita (ou tem legenda própria): nada é exibido. */
export const NotTranscribed: Story = { args: { transcription: null } };
