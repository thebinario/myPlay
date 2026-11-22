import type { Cue, SubtitleReader } from '../../../core/domain/subtitles';
import type { PageChunk, TimedChunk } from './content-chunking';

export type ContentSourceKind = 'pdf' | 'subtitle' | 'transcript';

/** Reads the text of each page of a document (PDF). Never writes. */
export interface DocumentTextExtractor {
  extractPages(absolutePath: string): Promise<string[]>;
}

export type { SubtitleReader };

/** Reads the stored transcript of a media file as cues. */
export interface TranscriptCueReader {
  readCues(mediaFileId: string): Promise<Cue[]>;
}

/** A document or subtitle whose text still has to be (re)indexed. */
export interface PendingExtraction {
  /** Media the chunks belong to: the PDF, or the video owning the subtitle. */
  mediaFileId: string;
  /** Stable key of the text origin within the media (`pdf`, `subtitle:<trackId>`). */
  originKey: string;
  sourceKind: ContentSourceKind;
  absolutePath: string;
  language: string | null;
  /** Identity of the file version (size + mtime); changes trigger re-extraction. */
  fingerprint: string;
}

export interface ContentChunkInput {
  page?: number | null;
  startMs?: number | null;
  endMs?: number | null;
  text: string;
}

export interface ContentHit {
  chunkId: number;
  sourceKind: ContentSourceKind;
  /** Matched text with the terms wrapped in `[[` and `]]`. */
  snippet: string;
  score: number;
  mediaFileId: string;
  language: string | null;
  documentId: string | null;
  documentTitle: string | null;
  page: number | null;
  lessonId: string | null;
  lessonTitle: string | null;
  courseId: string | null;
  courseTitle: string | null;
  startMs: number | null;
  endMs: number | null;
}

export interface ContentIndexStatus {
  indexed: number;
  failed: number;
  chunks: number;
}

/** Persistence of extracted chunks and their full-text index. */
export interface ContentIndexStore {
  listPending(sourceId: string, limit: number): Promise<PendingExtraction[]>;
  /** Atomically replaces the chunks of one origin and records success. */
  replaceChunks(item: PendingExtraction, chunks: ContentChunkInput[]): Promise<void>;
  markFailed(item: PendingExtraction, error: string): Promise<void>;
  search(ftsQuery: string, limit: number): Promise<ContentHit[]>;
  status(): Promise<ContentIndexStatus>;
}

export type { PageChunk, TimedChunk };

/** Where the assistant may look for sources. */
export interface RetrievalScope {
  courseId?: string;
  lessonId?: string;
  documentId?: string;
}

/** Turns text into vectors (local model). Passages and queries may differ. */
export interface Embedder {
  readonly modelId: string;
  /**
   * Minimum cosine similarity for a vector-only match (no keyword match) to be
   * considered relevant. Model-dependent; defaults to 0.3.
   */
  readonly minSimilarity?: number;
  embedPassages(texts: string[]): Promise<Float32Array[]>;
  embedQuery(text: string): Promise<Float32Array>;
}

export interface EmbeddingStore {
  /** Chunks without a vector for `model`. */
  listUnembedded(model: string, limit: number): Promise<Array<{ chunkId: number; text: string }>>;
  save(model: string, vectors: Array<{ chunkId: number; vector: Float32Array }>): Promise<void>;
}

export interface VectorMatch {
  chunkId: number;
  score: number;
}

export interface VectorIndex {
  search(
    model: string,
    query: Float32Array,
    k: number,
    allowedChunkIds: Set<number> | null,
  ): Promise<VectorMatch[]>;
}

/** Ranked chunk ids and hydrated hits, for hybrid retrieval. */
export interface RetrievalStore {
  rankByKeywords(ftsQuery: string, limit: number, scope: RetrievalScope): Promise<number[]>;
  chunkIdsInScope(scope: RetrievalScope): Promise<Set<number> | null>;
  hitsByIds(chunkIds: number[]): Promise<ContentHit[]>;
}
