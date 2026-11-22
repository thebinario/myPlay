import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from 'storybook/test';
import type { LocalAiRepository, LocalAiStatusView } from '@/modules/settings/domain/local-ai';
import { LocalAiPanel } from '@/modules/settings/presentation/components/LocalAiPanel';

const base: LocalAiStatusView = {
  enabled: true,
  language: 'portuguese',
  transcription: { pending: 18, inProgress: 1, done: 42, failed: 1 },
  models: [
    {
      id: 'onnx-community/whisper-base',
      task: 'transcription',
      approxBytes: 80_000_000,
      bytesOnDisk: 0,
      downloading: {
        file: 'onnx/decoder_model_merged_quantized.onnx',
        progress: 63,
        status: 'downloading',
      },
    },
  ],
};

const repo = (status: LocalAiStatusView): LocalAiRepository => ({
  status: async () => status,
  setEnabled: async (enabled) => ({ ...status, enabled }),
  removeModels: async () => status,
});

const meta: Meta<typeof LocalAiPanel> = {
  title: 'Settings/LocalAiPanel',
  component: LocalAiPanel,
  tags: ['autodocs'],
  parameters: { background: { default: '#141A28' } },
  args: { pollIntervalMs: 0 },
};

export default meta;
type Story = StoryObj<typeof LocalAiPanel>;

/** Primeiro uso: o modelo de transcrição está sendo baixado. */
export const DownloadingModel: Story = {
  args: { repository: repo(base) },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByText('Transcrição (Whisper) — baixando 63%'),
    ).toBeTruthy();
  },
};

/** Modelo já no disco: oferece liberar espaço. */
export const ModelReady: Story = {
  args: {
    repository: repo({
      ...base,
      transcription: { pending: 0, inProgress: 0, done: 60, failed: 0 },
      models: [{ ...base.models[0], bytesOnDisk: 82_400_000, downloading: null }],
    }),
  },
};

/** IA local desligada pela pessoa. */
export const Disabled: Story = {
  args: { repository: repo({ ...base, enabled: false }) },
};
