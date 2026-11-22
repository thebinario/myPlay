import type {
  ContentHit,
  Embedder,
  RetrievalScope,
  RetrievalStore,
  VectorIndex,
} from '../../domain/ports';
import { reciprocalRankFusion, toFtsAnyQuery } from '../../domain/retrieval';

export interface RetrieveContextDependencies {
  store: RetrievalStore;
  vectors: VectorIndex;
  /** Optional: without it retrieval is keyword-only (BM25). */
  embedder?: Embedder;
}

const DEFAULT_MIN_SIMILARITY = 0.3;

/**
 * Hybrid retrieval for the assistant: BM25 over any meaningful term plus
 * cosine similarity over embeddings, fused with Reciprocal Rank Fusion.
 * Keyword matches gate relevance; without any, only vector matches above the
 * model's similarity threshold count — so off-topic questions retrieve nothing.
 */
export class RetrieveContext {
  constructor(private readonly deps: RetrieveContextDependencies) {}

  async execute(question: string, scope: RetrievalScope = {}, k = 6): Promise<ContentHit[]> {
    const { store, vectors, embedder } = this.deps;
    const fts = toFtsAnyQuery(question);
    const keywordIds = fts ? await store.rankByKeywords(fts, k * 4, scope) : [];

    let vectorIds: number[] = [];
    if (embedder) {
      const allowed = await store.chunkIdsInScope(scope);
      const matches = await vectors.search(
        embedder.modelId,
        await embedder.embedQuery(question),
        k * 4,
        allowed,
      );
      const threshold = embedder.minSimilarity ?? DEFAULT_MIN_SIMILARITY;
      vectorIds = matches
        .filter((match) => keywordIds.length > 0 || match.score >= threshold)
        .map((match) => match.chunkId);
    }

    const ranked = reciprocalRankFusion([keywordIds, vectorIds]).slice(0, k);
    if (ranked.length === 0) return [];
    const hits = await store.hitsByIds(ranked);
    const byId = new Map(hits.map((hit) => [hit.chunkId, hit]));
    return ranked.map((id) => byId.get(id)).filter((hit): hit is ContentHit => !!hit);
  }
}
