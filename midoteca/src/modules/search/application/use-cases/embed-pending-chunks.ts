import type { Embedder, EmbeddingStore } from '../../domain/ports';

export interface EmbeddingPacing {
  waitForIdle(): Promise<void>;
  signal?: AbortSignal;
}

const BATCH_SIZE = 16;

/** Computes vectors for every chunk not yet embedded with the current model. */
export class EmbedPendingChunks {
  constructor(private readonly deps: { store: EmbeddingStore; embedder: Embedder }) {}

  async execute(pacing: EmbeddingPacing): Promise<number> {
    const { store, embedder } = this.deps;
    let embedded = 0;
    for (;;) {
      if (pacing.signal?.aborted) return embedded;
      const batch = await store.listUnembedded(embedder.modelId, BATCH_SIZE);
      if (batch.length === 0) return embedded;
      await pacing.waitForIdle();
      const vectors = await embedder.embedPassages(batch.map((chunk) => chunk.text));
      await store.save(
        embedder.modelId,
        batch.map((chunk, index) => ({ chunkId: chunk.chunkId, vector: vectors[index] })),
      );
      embedded += batch.length;
    }
  }
}
