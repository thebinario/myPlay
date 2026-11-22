import React, { useCallback, useEffect, useState } from 'react';
import type {
  LocalAiRepository,
  LocalAiStatusView,
  LocalModelView,
} from '@/modules/settings/domain/local-ai';
import {
  SettingsRow,
  ToggleField,
} from '@/modules/settings/presentation/components/SettingsControls';
import { useLocalAiRepository } from '@/modules/settings/presentation/providers/LocalAiProvider';

interface LocalAiPanelProps {
  /** Por padrão usa o repositório do `LocalAiProvider`. */
  repository?: LocalAiRepository;
  /** Atualiza o status periodicamente enquanto a tela está aberta (0 desliga). */
  pollIntervalMs?: number;
}

const TASK_LABEL: Record<LocalModelView['task'], string> = {
  transcription: 'Transcrição (Whisper)',
  embeddings: 'Busca semântica',
  chat: 'Assistente',
};

const mutedStyle: React.CSSProperties = { color: '#64748B', fontSize: '12px', margin: 0 };

function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  return `${Math.round(bytes / 1e6)} MB`;
}

function modelLine(model: LocalModelView): string {
  const name = TASK_LABEL[model.task];
  if (model.downloading) return `${name} — baixando ${Math.round(model.downloading.progress)}%`;
  if (model.bytesOnDisk > 0) return `${name} — ${formatBytes(model.bytesOnDisk)} no disco`;
  return `${name} — baixado no primeiro uso (~${formatBytes(model.approxBytes)})`;
}

/**
 * Status e controles da IA local (transcrição; depois busca semântica e
 * assistente). Tudo roda no computador; os modelos são baixados uma vez.
 */
export const LocalAiPanel: React.FC<LocalAiPanelProps> = ({
  repository: injected,
  pollIntervalMs = 3000,
}) => {
  const provided = useLocalAiRepository();
  const repository = injected ?? provided;
  const [status, setStatus] = useState<LocalAiStatusView | null>(null);

  const refresh = useCallback(() => {
    repository
      ?.status()
      .then(setStatus)
      .catch(() => undefined);
  }, [repository]);

  useEffect(() => {
    refresh();
    if (!pollIntervalMs) return;
    const timer = setInterval(refresh, pollIntervalMs);
    return () => clearInterval(timer);
  }, [refresh, pollIntervalMs]);

  if (!repository || !status) return null;
  const { transcription } = status;

  return (
    <section aria-labelledby="local-ai-title" style={{ display: 'grid', gap: '12px' }}>
      <h3 id="local-ai-title" style={{ color: '#F0F4FC', fontSize: '14px', margin: 0 }}>
        IA local
      </h3>
      <SettingsRow
        label="Recursos de IA locais"
        description="Transcreve aulas sem legenda e permite buscar no que foi falado. Roda no seu computador."
      >
        <ToggleField
          label="Recursos de IA locais"
          checked={status.enabled}
          onChange={(enabled) => {
            repository
              .setEnabled(enabled)
              .then(setStatus)
              .catch(() => undefined);
          }}
        />
      </SettingsRow>
      <p style={mutedStyle}>
        {`${transcription.done} transcritas · ${transcription.inProgress} em andamento · ${transcription.pending} na fila`}
        {transcription.failed > 0 ? ` · ${transcription.failed} com erro` : ''}
      </p>
      {status.models.map((model) => (
        <p key={model.id} style={mutedStyle}>
          {modelLine(model)}
        </p>
      ))}
      {status.models.some((model) => model.bytesOnDisk > 0) && (
        <button
          type="button"
          onClick={() => {
            repository
              .removeModels()
              .then(setStatus)
              .catch(() => undefined);
          }}
          style={{
            justifySelf: 'start',
            background: 'none',
            border: '1px solid rgba(248,113,113,0.4)',
            color: '#F87171',
            borderRadius: '6px',
            padding: '4px 10px',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          Remover modelos baixados
        </button>
      )}
    </section>
  );
};
