import type { SqliteDatabase } from '../../../platform/persistence/sqlite/database';
import type { EmbeddingStore, VectorIndex, VectorMatch } from '../domain/ports';
import { cosineSimilarity } from '../domain/retrieval';

function toBlob(vector: Float32Array): Buffer {
  return Buffer.from(vector.buffer, vector.byteOffset, vector.byteLength);
}

function fromBlob(blob: Buffer): Float32Array {
  const copy = new Float32Array(blob.byteLength / 4);
  for (let i = 0; i < copy.length; i++) copy[i] = blob.readFloatLE(i * 4);
  return copy;
}

/**
 * Embeddings in SQLite plus a brute-force cosine index cached in memory. A
 * personal library (tens of thousands of chunks × 384 dims) scans in a few ms;
 * swapping in `sqlite-vec` later only touches this adapter.
 */
export class SqliteEmbeddings implements EmbeddingStore, VectorIndex {
  private cache = new Map<string, Map<number, Float32Array>>();

  constructor(private readonly db: SqliteDatabase) {}

  async listUnembedded(model: string, limit: number) {
    return this.db
      .prepare(
        `SELECT c.id AS chunkId, c.text FROM content_chunks c
          LEFT JOIN chunk_embeddings e ON e.chunk_id = c.id AND e.model = ?
          WHERE e.chunk_id IS NULL
          ORDER BY c.id LIMIT ?`,
      )
      .all(model, limit) as Array<{ chunkId: number; text: string }>;
  }

  async save(model: string, vectors: Array<{ chunkId: number; vector: Float32Array }>) {
    const insert = this.db.prepare(
      `INSERT OR REPLACE INTO chunk_embeddings (chunk_id, model, dim, vector) VALUES (?, ?, ?, ?)`,
    );
    this.db.transaction(() => {
      for (const { chunkId, vector } of vectors) {
        insert.run(chunkId, model, vector.length, toBlob(vector));
      }
    });
    const cached = this.cache.get(model);
    if (cached) for (const { chunkId, vector } of vectors) cached.set(chunkId, vector);
  }

  async search(
    model: string,
    query: Float32Array,
    k: number,
    allowedChunkIds: Set<number> | null,
  ): Promise<VectorMatch[]> {
    const matches: VectorMatch[] = [];
    for (const [chunkId, vector] of this.load(model)) {
      if (allowedChunkIds && !allowedChunkIds.has(chunkId)) continue;
      matches.push({ chunkId, score: cosineSimilarity(query, vector) });
    }
    return matches.sort((a, b) => b.score - a.score).slice(0, k);
  }

  private load(model: string): Map<number, Float32Array> {
    let cached = this.cache.get(model);
    // Re-extracted chunks get new ids (old ones cascade away): reload when the
    // cached set no longer matches the table.
    const { n } = this.db
      .prepare(`SELECT COUNT(*) AS n FROM chunk_embeddings WHERE model = ?`)
      .get(model) as { n: number };
    if (!cached || cached.size !== n) {
      cached = new Map();
      const rows = this.db
        .prepare(
          `SELECT e.chunk_id, e.vector FROM chunk_embeddings e
             JOIN content_chunks c ON c.id = e.chunk_id
            WHERE e.model = ?`,
        )
        .all(model) as Array<{ chunk_id: number; vector: Buffer }>;
      for (const row of rows) cached.set(row.chunk_id, fromBlob(row.vector));
      this.cache.set(model, cached);
    }
    return cached;
  }
}
