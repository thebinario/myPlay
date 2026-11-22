/**
 * Atividade em segundo plano como o núcleo a entrega (read model). O frontend
 * só apresenta: rótulo, percentual e ordem já vêm calculados do backend.
 */
export type ActivityKindView =
  | 'scan'
  | 'media-analysis'
  | 'media-check'
  | 'transcription'
  | 'content-extraction'
  | 'embeddings'
  | 'other';

export interface ActivityItemView {
  id: string;
  kind: ActivityKindView;
  status: 'running' | 'queued';
  label: string;
  /** 0–100 calculado no núcleo; null quando o total é desconhecido. */
  percent: number | null;
  detail: string | null;
}

export interface ActivitySnapshotView {
  items: ActivityItemView[];
  running: number;
  queued: number;
}

export const IDLE_ACTIVITY: ActivitySnapshotView = { items: [], running: 0, queued: 0 };

/** Porta de leitura da atividade (store externo compatível com useSyncExternalStore). */
export interface ActivityRepository {
  getSnapshot(): ActivitySnapshotView;
  subscribe(listener: () => void): () => void;
}
