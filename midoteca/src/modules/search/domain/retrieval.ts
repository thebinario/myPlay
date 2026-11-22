/**
 * Retrieval rules for the assistant (RAG): natural-language questions are
 * matched by any meaningful term (BM25) and by meaning (embeddings), and both
 * rankings are fused. Pure.
 */

/** Common Portuguese/English words that carry no search meaning. */
const STOPWORDS = new Set(
  (
    'a o as os um uma uns umas de do da dos das no na nos nas em por para pra com sem ' +
    'e ou que se como qual quais quando onde porque por que é ser são foi era isso isto ' +
    'esse essa este esta aquele aquela eu tu ele ela nós vocês eles elas me te lhe meu ' +
    'minha seu sua há tem ter mais menos muito pouco já não sim ao aos à às sobre entre ' +
    'the of and or to in on for with is are was what how why which who'
  ).split(' '),
);

/** FTS5 query matching any meaningful term (prefix), or null if none remain. */
export function toFtsAnyQuery(text: string): string | null {
  const terms = [
    ...new Set(
      text
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter((term) => term.length > 1 && !STOPWORDS.has(term)),
    ),
  ];
  if (terms.length === 0) return null;
  return terms.map((term) => `"${term}"*`).join(' OR ');
}

/**
 * Reciprocal Rank Fusion: score(d) = Σ 1 / (k + rank). Robust to the very
 * different scales of BM25 and cosine similarity.
 */
export function reciprocalRankFusion<T>(rankings: T[][], k = 60): T[] {
  const scores = new Map<T, number>();
  for (const ranking of rankings) {
    ranking.forEach((item, rank) => {
      scores.set(item, (scores.get(item) ?? 0) + 1 / (k + rank + 1));
    });
  }
  return [...scores.entries()].sort((a, b) => b[1] - a[1]).map(([item]) => item);
}

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return normA && normB ? dot / Math.sqrt(normA * normB) : 0;
}
