import type { Meta, StoryObj } from '@storybook/react';
import { ImportPanel } from '@/shared/ui/components/ImportPanel';
import type { ImportViewModel } from '@/core/contracts/import';
import type { ImportState } from '@/core/domain/library-source';

const noop = () => {};

function viewModel(state: ImportState): ImportViewModel {
  return {
    state,
    start: noop,
    pause: noop,
    resume: noop,
    retry: noop,
    setScenario: noop,
    advance: noop,
    reset: noop,
  };
}

const meta: Meta<typeof ImportPanel> = {
  title: 'Shared/UI/ImportPanel',
  component: ImportPanel,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen', background: { default: '#0D111B' } },
  decorators: [
    (Story) => (
      <div style={{ padding: '24px', maxWidth: '640px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ImportPanel>;

export const Idle: Story = {
  args: { flow: viewModel({ phase: 'idle', scenario: 'normal', progress: 0, discovered: [] }) },
};

export const Scanning: Story = {
  args: {
    flow: viewModel({
      phase: 'scanning',
      scenario: 'normal',
      progress: 40,
      discovered: [
        { id: '1', title: 'Fundamentos de TypeScript', kind: 'course', sourceId: 'a' },
        { id: '2', title: 'A História do Código', kind: 'movie', sourceId: 'a' },
      ],
    }),
  },
};

export const Paused: Story = {
  args: {
    flow: viewModel({
      phase: 'paused',
      scenario: 'normal',
      progress: 40,
      discovered: [{ id: '1', title: 'Fundamentos de TypeScript', kind: 'course', sourceId: 'a' }],
    }),
  },
};

export const Done: Story = {
  args: {
    flow: viewModel({
      phase: 'done',
      scenario: 'normal',
      progress: 100,
      discovered: [{ id: '1', title: 'Fundamentos de TypeScript', kind: 'course', sourceId: 'a' }],
    }),
  },
};

export const Empty: Story = {
  args: {
    flow: viewModel({
      phase: 'empty',
      scenario: 'empty',
      progress: 100,
      discovered: [],
      message: 'Nenhum conteúdo compatível encontrado.',
    }),
  },
};

export const PermissionDenied: Story = {
  args: {
    flow: viewModel({
      phase: 'denied',
      scenario: 'denied',
      progress: 0,
      discovered: [],
      message: 'Permissão de leitura negada para esta pasta.',
    }),
  },
};
