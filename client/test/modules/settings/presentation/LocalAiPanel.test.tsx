import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LocalAiRepository, LocalAiStatusView } from '@/modules/settings/domain/local-ai';
import { LocalAiPanel } from '@/modules/settings/presentation/components/LocalAiPanel';

const status: LocalAiStatusView = {
  enabled: true,
  language: 'portuguese',
  transcription: { pending: 4, inProgress: 1, done: 12, failed: 0 },
  models: [
    {
      id: 'onnx-community/whisper-base',
      task: 'transcription',
      approxBytes: 80_000_000,
      bytesOnDisk: 0,
      downloading: {
        file: 'onnx/encoder_model_quantized.onnx',
        progress: 42,
        status: 'downloading',
      },
    },
  ],
};

function repository(overrides: Partial<LocalAiRepository> = {}): LocalAiRepository {
  return {
    status: vi.fn(async () => status),
    setEnabled: vi.fn(async (enabled: boolean) => ({ ...status, enabled })),
    removeModels: vi.fn(async () => status),
    ...overrides,
  };
}

describe('LocalAiPanel', () => {
  it('mostra o status da transcrição e o download do modelo vindos do backend', async () => {
    render(<LocalAiPanel repository={repository()} pollIntervalMs={0} />);

    expect(
      await screen.findByText('12 transcritas · 1 em andamento · 4 na fila'),
    ).toBeInTheDocument();
    expect(screen.getByText('Transcrição (Whisper) — baixando 42%')).toBeInTheDocument();
  });

  it('liga e desliga a IA local pelo backend', async () => {
    const repo = repository();
    render(<LocalAiPanel repository={repo} pollIntervalMs={0} />);

    await userEvent.click(await screen.findByRole('switch', { name: 'Recursos de IA locais' }));
    expect(repo.setEnabled).toHaveBeenCalledWith(false);
  });
});
