import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from 'storybook/test';
import { ActivityIndicator } from '@/modules/activity/presentation/ActivityIndicator';
import type { ActivitySnapshotView } from '@/modules/activity/domain/activity';

const scanning: ActivitySnapshotView = {
  running: 1,
  queued: 0,
  items: [
    {
      id: 'scan:1',
      kind: 'scan',
      status: 'running',
      label: 'Analisando biblioteca — Cursos',
      percent: null,
      detail: 'Módulo 2 - Alta Performance/01 - Abertura.mp4',
    },
  ],
};

const busy: ActivitySnapshotView = {
  running: 2,
  queued: 2,
  items: [
    ...scanning.items,
    {
      id: 'job-1',
      kind: 'transcription',
      status: 'running',
      label: 'Transcrevendo vídeos — Cursos',
      percent: 42,
      detail: '03 - Priorização.mp4',
    },
    {
      id: 'job-2',
      kind: 'content-extraction',
      status: 'queued',
      label: 'Indexando textos — Cursos',
      percent: null,
      detail: null,
    },
    {
      id: 'job-3',
      kind: 'embeddings',
      status: 'queued',
      label: 'Preparando busca inteligente',
      percent: null,
      detail: null,
    },
  ],
};

const meta: Meta<typeof ActivityIndicator> = {
  title: 'Activity/ActivityIndicator',
  component: ActivityIndicator,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ padding: '120px 24px 24px', background: '#121622', minHeight: '360px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ActivityIndicator>;

/** Nada em processamento: o indicador não aparece. */
export const Idle: Story = { args: { snapshot: { items: [], running: 0, queued: 0 } } };

/** Escaneamento sem total conhecido: barra indeterminada. */
export const Scanning: Story = { args: { snapshot: scanning } };

/** Várias tarefas e fila; a lista abre ao passar o mouse. */
export const BusyHovered: Story = {
  args: { snapshot: busy },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.hover(canvas.getByTestId('activity-indicator'));
    const list = await canvas.findByRole('list', { name: /atividades/i });
    await expect(list).toHaveTextContent('42%');
    await expect(list).toHaveTextContent('Na fila');
  },
};
