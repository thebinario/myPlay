import type { Meta, StoryObj } from '@storybook/react';
import { PlayerUnavailableState } from '@/modules/player/presentation/components/PlayerUnavailableState';

const meta: Meta<typeof PlayerUnavailableState> = {
  title: 'Player/PlayerUnavailableState',
  component: PlayerUnavailableState,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    backgrounds: { default: 'dark' },
  },
  argTypes: {
    onReconnect: { action: 'reconnect' },
  },
};

export default meta;
type Story = StoryObj<typeof PlayerUnavailableState>;

/** Erro padrão: arquivo não localizado ou HD desconectado */
export const MissingFile: Story = {
  args: {
    onReconnect: () => {},
  },
};

/** Erro: formato de vídeo não suportado pelo reprodutor (ex.: MKV) */
export const UnsupportedFormat: Story = {
  args: {
    errorInfo: {
      kind: 'unsupported_format',
      format: 'MKV',
      title: 'Formato de vídeo não suportado',
      message: 'O formato .mkv ou o codec deste vídeo não é compatível nativamente com o reprodutor.',
      suggestion: 'Recomendamos converter o arquivo para MP4 (H.264/AAC) ou WebM para assistir.',
    },
    onReconnect: () => {},
  },
};

/** Erro: formato de vídeo AVI */
export const UnsupportedAviFormat: Story = {
  args: {
    errorInfo: {
      kind: 'unsupported_format',
      format: 'AVI',
      title: 'Formato de vídeo não suportado',
      message: 'O formato .avi ou o codec deste vídeo não é compatível nativamente com o reprodutor.',
      suggestion: 'Recomendamos converter o arquivo para MP4 (H.264/AAC) ou WebM para assistir.',
    },
    onReconnect: () => {},
  },
};

/** Erro: arquivo corrompido ou erro de decodificação */
export const CorruptedFile: Story = {
  args: {
    errorInfo: {
      kind: 'corrupted',
      format: 'MP4',
      title: 'Arquivo corrompido ou danificado',
      message: 'Ocorreu uma falha ao decodificar os dados do vídeo. O arquivo pode estar corrompido, incompleto ou danificado durante a transferência.',
      suggestion: 'Verifique se o arquivo original abre em outros players ou tente copiar novamente o arquivo.',
    },
    onReconnect: () => {},
  },
};
