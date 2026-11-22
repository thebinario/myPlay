import { totalmem } from 'node:os';
import type { LlmClient } from '../../modules/assistant/domain/ports';
import type { LocalModelOptions } from './local-models';

/** File name node-llama-cpp uses for `hf:<owner>/<repo>/<file>` downloads. */
export function ggufFileName(uri: string): string | undefined {
  const match = /^hf:([^/]+)\/[^/]+\/(.+)$/.exec(uri);
  return match ? `hf_${match[1]}_${match[2]}` : undefined;
}

export interface LlmModelChoice {
  /** Hugging Face URI understood by node-llama-cpp (`hf:<repo>/<file>`). */
  uri: string;
  id: string;
  approxBytes: number;
}

const MODELS = {
  large: {
    uri: 'hf:Qwen/Qwen2.5-3B-Instruct-GGUF/qwen2.5-3b-instruct-q4_k_m.gguf',
    id: 'Qwen/Qwen2.5-3B-Instruct-GGUF',
    approxBytes: 2_100_000_000,
  },
  small: {
    uri: 'hf:Qwen/Qwen2.5-1.5B-Instruct-GGUF/qwen2.5-1.5b-instruct-q4_k_m.gguf',
    id: 'Qwen/Qwen2.5-1.5B-Instruct-GGUF',
    approxBytes: 1_100_000_000,
  },
} satisfies Record<string, LlmModelChoice>;

/**
 * Picks the chat model by available RAM (no configuration): 3B with ≥ 8 GB,
 * otherwise 1.5B. `MIDOTECA_LLM_MODEL` (an `hf:` URI) overrides it, e.g. for
 * tests with a tiny model.
 */
export function defaultLlmModel(): LlmModelChoice {
  const override = process.env.MIDOTECA_LLM_MODEL?.trim();
  if (override) {
    const [, repo = override] = /^hf:([^/]+\/[^/]+)\//.exec(override) ?? [];
    return { uri: override, id: repo, approxBytes: 500_000_000 };
  }
  return totalmem() >= 8 * 1024 ** 3 ? MODELS.large : MODELS.small;
}

/* Minimal structural types of the node-llama-cpp v3 API used here. */
interface LlamaSequence {
  dispose(): void;
}
interface LlamaContext {
  getSequence(): LlamaSequence;
  dispose(): Promise<void>;
}
interface LlamaModel {
  createContext(options: { contextSize: number }): Promise<LlamaContext>;
}
interface NodeLlamaCpp {
  getLlama(): Promise<{ loadModel(options: { modelPath: string }): Promise<LlamaModel> }>;
  resolveModelFile(
    uri: string,
    options: {
      directory: string;
      onProgress?: (status: { totalSize: number; downloadedSize: number }) => void;
    },
  ): Promise<string>;
  LlamaChatSession: new (options: { contextSequence: LlamaSequence; systemPrompt: string }) => {
    prompt(
      text: string,
      options: {
        onTextChunk?: (chunk: string) => void;
        signal?: AbortSignal;
        maxTokens?: number;
        temperature?: number;
        stopOnAbortSignal?: boolean;
      },
    ): Promise<string>;
  };
}

const importEsm = new Function('specifier', 'return import(specifier)') as (
  specifier: string,
) => Promise<NodeLlamaCpp>;

async function loadNodeLlamaCpp(): Promise<NodeLlamaCpp> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('node-llama-cpp') as NodeLlamaCpp;
  } catch {
    // ESM with top-level await cannot be required; use a native dynamic import.
    return importEsm('node-llama-cpp');
  }
}

/**
 * Local chat model with llama.cpp (node-llama-cpp; prebuilt binaries pick GPU
 * via Vulkan/CUDA/Metal when available, CPU otherwise). The GGUF file is
 * downloaded on first use into the models folder. One generation at a time.
 */
export class LlamaLlmClient implements LlmClient {
  readonly modelId: string;
  private model: Promise<{ lib: NodeLlamaCpp; model: LlamaModel }> | null = null;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly options: LocalModelOptions,
    private readonly choice: LlmModelChoice,
  ) {
    this.modelId = choice.id;
  }

  generate(
    prompt: { system: string; user: string },
    options: { onToken?: (token: string) => void; signal?: AbortSignal },
  ): Promise<string> {
    const run = this.queue.then(() => this.run(prompt, options));
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async run(
    prompt: { system: string; user: string },
    options: { onToken?: (token: string) => void; signal?: AbortSignal },
  ): Promise<string> {
    const { lib, model } = await this.load();
    const context = await model.createContext({ contextSize: 4096 });
    const sequence = context.getSequence();
    try {
      const session = new lib.LlamaChatSession({
        contextSequence: sequence,
        systemPrompt: prompt.system,
      });
      return await session.prompt(prompt.user, {
        onTextChunk: options.onToken,
        signal: options.signal,
        stopOnAbortSignal: true,
        maxTokens: 512,
        temperature: 0.2,
      });
    } finally {
      sequence.dispose();
      await context.dispose();
    }
  }

  private load() {
    this.model ??= (async () => {
      const lib = await loadNodeLlamaCpp();
      const modelPath = await lib.resolveModelFile(this.choice.uri, {
        directory: this.options.cacheDir,
        onProgress: ({ totalSize, downloadedSize }) =>
          this.options.onProgress?.(this.choice.id, {
            file: this.choice.uri,
            progress: totalSize ? (downloadedSize / totalSize) * 100 : 0,
            status: 'downloading',
          }),
      });
      this.options.onProgress?.(this.choice.id, { file: '', progress: 100, status: 'ready' });
      const llama = await lib.getLlama();
      return { lib, model: await llama.loadModel({ modelPath }) };
    })();
    this.model.catch(() => {
      this.model = null;
    });
    return this.model;
  }
}

export function createDefaultLlm(options: LocalModelOptions, choice: LlmModelChoice): LlmClient {
  return new LlamaLlmClient(options, choice);
}
