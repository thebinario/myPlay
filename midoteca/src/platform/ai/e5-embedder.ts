import type { Embedder } from '../../modules/search/domain/ports';
import { localModelOptions, type LocalModelOptions } from './local-models';

interface Tensor {
  dims: number[];
  data: Float32Array;
}

type FeatureExtractor = (
  texts: string[],
  options: { pooling: 'mean'; normalize: boolean },
) => Promise<Tensor>;

export const E5_MODEL = 'Xenova/multilingual-e5-small';

/**
 * Local multilingual embeddings (E5 small, 384 dims, ~120 MB quantized). E5
 * expects `query:` / `passage:` prefixes. Downloaded once, then offline.
 */
export class E5Embedder implements Embedder {
  readonly modelId = E5_MODEL;
  /**
   * E5 similarities are compressed near the top. Measured with the real model
   * (pt-BR): unrelated passages 0.77–0.82, related 0.85–0.90.
   */
  readonly minSimilarity = 0.845;
  private extractor: Promise<FeatureExtractor> | null = null;

  constructor(private readonly options: LocalModelOptions) {}

  embedPassages(texts: string[]): Promise<Float32Array[]> {
    return this.embed(texts.map((text) => `passage: ${text}`));
  }

  async embedQuery(text: string): Promise<Float32Array> {
    const [vector] = await this.embed([`query: ${text}`]);
    return vector;
  }

  private async embed(texts: string[]): Promise<Float32Array[]> {
    if (texts.length === 0) return [];
    const extractor = await this.load();
    const output = await extractor(texts, { pooling: 'mean', normalize: true });
    const [count, dims] = output.dims;
    return Array.from({ length: count }, (_, row) =>
      Float32Array.from(output.data.subarray(row * dims, (row + 1) * dims)),
    );
  }

  private load(): Promise<FeatureExtractor> {
    this.extractor ??= (async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { pipeline } = require('@huggingface/transformers') as {
        pipeline: (task: string, model: string, options: object) => Promise<FeatureExtractor>;
      };
      return pipeline(
        'feature-extraction',
        E5_MODEL,
        localModelOptions(this.options, E5_MODEL, 'q8'),
      );
    })();
    this.extractor.catch(() => {
      this.extractor = null;
    });
    return this.extractor;
  }
}
