import { join } from 'node:path';
import { resolveAppDataDir } from '../core/app-paths';
import {
  SqliteTranscriptStore,
  TranscriptionService,
  type AudioDecoder,
  type Transcriber,
  type TranscriptionStatus,
} from '../modules/media';
import { AI_ENABLED_SETTING } from '../modules/media/application/transcription.service';
import type { SettingsRepository } from '../modules/settings/domain/ports';
import type { LlmClient } from '../modules/assistant/domain/ports';
import { isStructuredLlm, type StructuredLlm } from '../core/structured-llm';
import type { Embedder } from '../modules/search/domain/ports';
import { E5_MODEL, E5Embedder } from '../platform/ai/e5-embedder';
import { createDefaultLlm, defaultLlmModel, ggufFileName } from '../platform/ai/llama-llm-client';
import { removeModels } from '../platform/ai/local-models';
import { LocalModelRegistry, type LocalModelStatus } from '../platform/ai/model-registry';
import { WHISPER_MODEL, WhisperTranscriber } from '../platform/ai/whisper-transcriber';
import { FfmpegAudioDecoder } from '../platform/media/ffmpeg-audio-decoder';
import type { SqliteDatabase } from '../platform/persistence/sqlite/database';
import type { TranscriptionTools } from './background-jobs';

export interface LocalAiOptions {
  /** Enables local transcription/RAG jobs (desktop runtime). */
  enabled: boolean;
  /** Where models are downloaded. Defaults to `<appData>/models`. */
  cacheDir?: string;
  /**
   * Use the real local models for tools not injected (desktop runtime). When
   * false, only injected tools exist (tests never download models).
   */
  useDefaultModels: boolean;
  /** Test seams; default to Whisper/E5 (transformers.js), llama.cpp and ffmpeg. */
  transcriber?: Transcriber;
  audio?: AudioDecoder;
  embedder?: Embedder;
  llm?: LlmClient;
}

export interface LocalAiTools {
  transcription: TranscriptionTools | undefined;
  embedder: Embedder | undefined;
  llm: LlmClient | undefined;
  /** Same model, JSON-constrained (course organization). */
  structured: StructuredLlm | undefined;
}

export interface LocalAiStatus {
  enabled: boolean;
  language: string;
  transcription: TranscriptionStatus;
  models: LocalModelStatus[];
}

/** Facade over local AI settings, status and model storage. */
export class LocalAi {
  constructor(
    private readonly settings: SettingsRepository,
    readonly transcription: TranscriptionService,
    readonly registry: LocalModelRegistry,
    readonly cacheDir: string,
  ) {}

  async status(): Promise<LocalAiStatus> {
    return {
      enabled: await this.transcription.isEnabled(),
      language: await this.transcription.language(),
      transcription: await this.transcription.status(),
      models: this.registry.list(),
    };
  }

  async setEnabled(enabled: boolean): Promise<LocalAiStatus> {
    await this.settings.set(AI_ENABLED_SETTING, enabled === true);
    return this.status();
  }

  /** Frees disk space; models download again on next use. Never touches media. */
  async removeModels(): Promise<LocalAiStatus> {
    removeModels(this.cacheDir);
    return this.status();
  }
}

export function createLocalAi(
  database: SqliteDatabase,
  settings: SettingsRepository,
  options: LocalAiOptions,
): { ai: LocalAi; tools: LocalAiTools } {
  const cacheDir = options.cacheDir ?? join(resolveAppDataDir(), 'models');
  const registry = new LocalModelRegistry(cacheDir);
  const llmModel = defaultLlmModel();
  registry.register({ id: WHISPER_MODEL, task: 'transcription', approxBytes: 80_000_000 });
  registry.register({ id: E5_MODEL, task: 'embeddings', approxBytes: 120_000_000 });
  registry.register({
    id: llmModel.id,
    task: 'chat',
    approxBytes: llmModel.approxBytes,
    fileName: ggufFileName(llmModel.uri),
  });
  const store = new SqliteTranscriptStore(database);
  const service = new TranscriptionService(store, settings);
  const ai = new LocalAi(settings, service, registry, cacheDir);
  if (!options.enabled) {
    return {
      ai,
      tools: {
        transcription: undefined,
        embedder: undefined,
        llm: undefined,
        structured: undefined,
      },
    };
  }

  const modelOptions = { cacheDir, onProgress: registry.report };
  const defaults = options.useDefaultModels;
  const transcriber =
    options.transcriber ?? (defaults ? new WhisperTranscriber(modelOptions) : undefined);
  const llm = options.llm ?? (defaults ? createDefaultLlm(modelOptions, llmModel) : undefined);
  return {
    ai,
    tools: {
      transcription: transcriber
        ? { store, service, transcriber, audio: options.audio ?? new FfmpegAudioDecoder() }
        : undefined,
      embedder: options.embedder ?? (defaults ? new E5Embedder(modelOptions) : undefined),
      llm,
      structured: isStructuredLlm(llm) ? llm : undefined,
    },
  };
}
