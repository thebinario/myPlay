import { modelDiskUsage, type ModelDownloadProgress } from './local-models';

export interface LocalModelInfo {
  id: string;
  task: 'transcription' | 'embeddings' | 'chat';
  /** Approximate download size, shown before the first download. */
  approxBytes: number;
  /** Single-file models (GGUF) stored directly in the cache folder. */
  fileName?: string;
}

export interface LocalModelStatus extends LocalModelInfo {
  bytesOnDisk: number;
  downloading: ModelDownloadProgress | null;
}

/**
 * Tracks the local models the app uses and their download progress (fed by
 * the adapters), so Settings can show what was downloaded and how much space
 * it takes. Process-local; the files themselves are the source of truth.
 */
export class LocalModelRegistry {
  private readonly progress = new Map<string, ModelDownloadProgress>();
  private readonly models = new Map<string, LocalModelInfo>();

  constructor(private readonly cacheDir: string) {}

  register(model: LocalModelInfo): void {
    this.models.set(model.id, model);
  }

  report = (modelId: string, progress: ModelDownloadProgress): void => {
    if (progress.status === 'ready') this.progress.delete(modelId);
    else this.progress.set(modelId, progress);
  };

  list(): LocalModelStatus[] {
    return [...this.models.values()].map((model) => ({
      ...model,
      bytesOnDisk: modelDiskUsage(this.cacheDir, model.id, model.fileName),
      downloading: this.progress.get(model.id) ?? null,
    }));
  }
}
