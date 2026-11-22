import type { SqliteDatabase } from '../database';
import type { Migration } from './types';

/**
 * 0010 - chunk embeddings (semantic search / RAG).
 *
 * Purely additive. One float32 vector per (chunk, model), stored as a BLOB;
 * removed with its chunk. Search is a brute-force cosine scan in memory (see
 * ADR 0010), so no vector extension is required.
 */
export const migration0010ChunkEmbeddings: Migration = {
  id: 10,
  name: '0010-chunk-embeddings',
  up(db: SqliteDatabase): void {
    db.exec(`
      CREATE TABLE chunk_embeddings (
        chunk_id INTEGER NOT NULL REFERENCES content_chunks(id) ON DELETE CASCADE,
        model    TEXT NOT NULL,
        dim      INTEGER NOT NULL CHECK (dim > 0),
        vector   BLOB NOT NULL,
        PRIMARY KEY (chunk_id, model)
      );
      CREATE INDEX ix_chunk_embeddings_model ON chunk_embeddings(model);
    `);
  },
  down(db: SqliteDatabase): void {
    db.exec(`DROP TABLE IF EXISTS chunk_embeddings;`);
  },
};
