import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from 'storybook/test';
import type { ActivityItemView, ActivitySnapshotView } from '@/modules/activity/domain/activity';
import { ActivityIndicator } from '@/modules/activity/presentation/ActivityIndicator';

const NOW = Date.parse('2026-11-22T12:00:00Z');
const minutesAgo = (minutes: number) => new Date(NOW - minutes * 60_000).toISOString();
const item = (
  patch: Partial<ActivityItemView> & Pick<ActivityItemView, 'id'>,
): ActivityItemView => ({
  kind: 'other',
  status: 'completed',
  label: '',
  percent: null,
  detail: null,
  finishedAt: null,
  ...patch,
});

/** O mesmo conteúdo do protótipo: 1 em andamento e os 4 últimos encerrados. */
const recentFive: ActivitySnapshotView = {
  running: 1,
  queued: 0,
  items: [
    item({
      id: 'scan',
      kind: 'scan',
      status: 'running',
      label: 'Atualizando biblioteca',
      percent: 62,
    }),
  ],
  recent: [
    item({
      id: 'a',
      kind: 'transcription',
      label: 'Transcrição · Boas-vindas',
      finishedAt: minutesAgo(2),
    }),
    item({
      id: 'b',
      kind: 'media-analysis',
      label: 'Transcrição · 01 - Introdução',
      finishedAt: minutesAgo(3),
    }),
    item({
      id: 'c',
      kind: 'content-extraction',
      label: 'Indexação de documentos · Cursos',
      finishedAt: minutesAgo(12),
    }),
    item({
      id: 'd',
      kind: 'scan',
      status: 'failed',
      label: 'Transcrição · 02 - Configurando o ambiente',
      detail: 'Áudio ilegível: Invalid data found when processing input',
      finishedAt: minutesAgo(60),
    }),
  ],
};

/** Escaneamento sem total conhecido (barra indeterminada) e tarefas na fila. */
const queued: ActivitySnapshotView = {
  running: 1,
  queued: 2,
  items: [
    item({ id: 'scan', kind: 'scan', status: 'running', label: 'Atualizando biblioteca · Cursos' }),
    item({ id: 'q1', kind: 'transcription', status: 'queued', label: 'Transcrição · Cursos' }),
    item({ id: 'q2', kind: 'embeddings', status: 'queued', label: 'Busca inteligente' }),
  ],
  recent: [],
};

const empty: ActivitySnapshotView = { items: [], running: 0, queued: 0, recent: [] };

const meta: Meta<typeof ActivityIndicator> = {
  title: 'Activity/ActivityIndicator',
  component: ActivityIndicator,
  tags: ['autodocs'],
  args: { now: NOW },
  decorators: [
    (Story) => (
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          padding: '24px 40px',
          background: '#0B0E17',
          minHeight: '440px',
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ActivityIndicator>;

async function openPanel(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);
  await userEvent.click(canvas.getByRole('button', { name: /atividade/i }));
  return canvas.findByRole('dialog', { name: 'Atividade' });
}

/** Botão fechado e parado: nada em processamento. */
export const Idle: Story = { args: { snapshot: empty } };

/** Painel aberto sem histórico. */
export const IdleOpen: Story = {
  args: { snapshot: empty },
  play: async ({ canvasElement }) => {
    const dialog = await openPanel(canvasElement);
    await expect(dialog).toHaveTextContent('Nenhum processo recente');
  },
};

/** Fiel ao protótipo: "Últimos 5 processos", aulas concluídas e uma falha com o motivo. */
export const RecentProcesses: Story = {
  args: { snapshot: recentFive },
  play: async ({ canvasElement }) => {
    const dialog = await openPanel(canvasElement);
    await expect(dialog).toHaveTextContent('Últimos 5 processos');
    await expect(dialog).toHaveTextContent('Em andamento · 62%');
    await expect(dialog).toHaveTextContent('Concluído · há 2 min');
    await expect(dialog).toHaveTextContent('Falhou · há 1 h');
    await expect(dialog).toHaveTextContent('Áudio ilegível: Invalid data found');
  },
};

/** Progresso desconhecido e fila. */
export const QueuedWork: Story = {
  args: { snapshot: queued },
  play: async ({ canvasElement }) => {
    const dialog = await openPanel(canvasElement);
    await expect(within(dialog).getAllByText('Na fila')).toHaveLength(2);
  },
};
