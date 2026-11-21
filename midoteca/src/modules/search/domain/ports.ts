import type { Cue, PageChunk, TimedChunk } from './content-chunking';

export type ContentSourceKind = 'pdf' | 'subtitle' | 'transcript';

/** Reads the text of each page of a document (PDF). Never writes. */
export interface DocumentTextExtractor {
  extractPages(absolutePath: string): Promise<string[]>;
}

/** Reads subtitle cues from a file (SRT/VTT). Never writes. */
export interface SubtitleReader {
  readCues(absolutePath: string): Promise<Cue[]>;
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
