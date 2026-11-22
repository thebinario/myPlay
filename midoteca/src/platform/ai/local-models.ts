import { existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

export interface LocalModelOptions {
  /** Folder where models are downloaded once and reused offline. */
  cacheDir: string;
  /** Receives download progress (0..100) per model, for the settings screen. */
  onProgress?: (modelId: string, progress: ModelDownloadProgress) => void;
}

export interface ModelDownloadProgress {
  file: string;
  /** 0..100 for the current file; 100 once the model is ready. */
  progress: number;
  status: 'downloading' | 'ready';
}

interface TransformersProgress {
  status: string;
  file?: string;
  progress?: number;
}

/** Common transformers.js options: CPU, quantized weights, our cache folder. */
export function localModelOptions(options: LocalModelOptions, modelId: string, dtype: string) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { env } = require('@huggingface/transformers') as {
    env: { allowLocalModels: boolean; cacheDir: string | null };
  };
  env.allowLocalModels = false;
  env.cacheDir = options.cacheDir;
  return {
    cache_dir: options.cacheDir,
    device: 'cpu',
    dtype,
    progress_callback: (info: TransformersProgress) => {
      if (info.status === 'progress' && info.file) {
        options.onProgress?.(modelId, {
          file: info.file,
          progress: info.progress ?? 0,
          status: 'downloading',
        });
      } else if (info.status === 'ready') {
        options.onProgress?.(modelId, { file: '', progress: 100, status: 'ready' });
      }
    },
  };
}

/** Bytes used by a downloaded model, or 0 when absent. */
export function modelDiskUsage(cacheDir: string, modelId: string, fileName?: string): number {
  if (fileName) {
    const file = join(cacheDir, fileName);
    return existsSync(file) ? statSync(file).size : 0;
  }
  const folder = join(cacheDir, ...modelId.split('/'));
  if (!existsSync(folder)) return 0;
  let total = 0;
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else total += statSync(path).size;
    }
  };
  walk(folder);
  return total;
}

/** Deletes downloaded models (app data only; never user media). */
export function removeModels(cacheDir: string): void {
  rmSync(cacheDir, { recursive: true, force: true });
}
