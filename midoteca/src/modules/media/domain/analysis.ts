import type { MediaType } from '../../../core/domain/media-type';
import type { DuplicateKind } from './duplicate-detection';

/** Reads file bytes to fingerprint identical content. Never writes. */
export interface FileHasher {
  /** sha256 of the file size plus its first and last MiB (cheap filter). */
  partialHash(absolutePath: string): Promise<string>;
  /** sha256 of the whole file (only for candidates). */
  fullHash(absolutePath: string): Promise<string>;
}

/** Container metadata (duration) without decoding the whole file. */
export interface MediaProber {
  probe(absolutePath: string): Promise<{ durationMs: number | null }>;
}

/** Per-frame dHashes (16 hex chars each) at proportional timestamps. */
export interface FrameSampler {
  sampleHashes(absolutePath: string, durationMs: number): Promise<string[]>;
}

/** A media file as seen by the analysis use case. */
export interface AnalyzableMedia {
  id: string;
  sourceId: string;
  absolutePath: string;
  mediaType: MediaType;
  fileSize: number | null;
  durationMs: number | null;
  sha256: string | null;
  partialHash: string | null;
}

export interface MediaAnalysisStatus {
  pending: number;
  analyzed: number;
  failed: number;
}

/** Persistence of analysis results. Writes catalog rows only. */
export interface MediaAnalysisStore {
  /** Available videos/PDFs of the source not yet analyzed (`analyzed_at` NULL). */
  listPending(sourceId: string, limit: number): Promise<AnalyzableMedia[]>;
  saveDuration(id: string, durationMs: number): Promise<void>;
  savePartialHash(id: string, partialHash: string): Promise<void>;
  saveSha256(id: string, sha256: string): Promise<void>;
  markAnalyzed(id: string, error: string | null): Promise<void>;
  /** Other files with the same size and partial hash. */
  findHashTwins(id: string): Promise<AnalyzableMedia[]>;
  /** Analyzed videos with a close duration and a different (or unknown) sha256. */
  findFingerprintCandidates(
    id: string,
    durationMs: number,
    toleranceMs: number,
  ): Promise<AnalyzableMedia[]>;
  getFingerprint(id: string): Promise<string[] | null>;
  saveFingerprint(id: string, frames: string[]): Promise<void>;
  saveDuplicateLink(a: string, b: string, similarity: number): Promise<void>;
  status(): Promise<MediaAnalysisStatus>;
}

/** A lesson that plays a given media file, with its progress (read model). */
export interface DuplicateLessonRef {
  lessonId: string;
  lessonTitle: string;
  courseId: string;
  courseTitle: string;
  watchedRatio: number | null;
  completedAt: string | null;
}

export interface DuplicateMember {
  mediaFileId: string;
  sourceId: string;
  relativePath: string;
  mediaType: MediaType;
  fileSize: number | null;
  durationMs: number | null;
  lessons: DuplicateLessonRef[];
  documents: Array<{ documentId: string; title: string }>;
}

export interface DuplicateGroup {
  kind: DuplicateKind;
  members: DuplicateMember[];
}

/** Read side used to assemble duplicate groups. */
export interface DuplicateReadStore {
  listHashed(): Promise<Array<{ id: string; sha256: string | null }>>;
  listLinks(): Promise<Array<{ a: string; b: string; similarity: number }>>;
  describe(mediaFileIds: string[]): Promise<DuplicateMember[]>;
  primaryMediaOf(lessonId: string): Promise<string | null>;
}
