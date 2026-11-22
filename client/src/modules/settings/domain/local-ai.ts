/** Status da IA local fornecido pelo núcleo (`ai.status`). */
export interface LocalModelView {
  id: string;
  task: 'transcription' | 'embeddings' | 'chat';
  approxBytes: number;
  bytesOnDisk: number;
  downloading: { file: string; progress: number; status: 'downloading' | 'ready' } | null;
}

export interface LocalAiStatusView {
  enabled: boolean;
  language: string;
  transcription: { pending: number; inProgress: number; done: number; failed: number };
  models: LocalModelView[];
}

export interface LocalAiRepository {
  status(): Promise<LocalAiStatusView>;
  setEnabled(enabled: boolean): Promise<LocalAiStatusView>;
  removeModels(): Promise<LocalAiStatusView>;
}
