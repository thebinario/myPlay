import type { Cue } from '../../../core/domain/subtitles';

/** Audio is transcribed in windows of this length (Whisper's native context). */
export const TRANSCRIPTION_WINDOW_MS = 30_000;
/** Language used when nothing better is known (product language). */
export const DEFAULT_TRANSCRIPTION_LANGUAGE = 'portuguese';

export interface TranscriptionWindow {
  offsetMs: number;
  lengthMs: number;
}

/** Remaining windows from the checkpoint (`processedMs`) to the end. */
export function transcriptionWindows(
  durationMs: number,
  processedMs: number,
  windowMs = TRANSCRIPTION_WINDOW_MS,
): TranscriptionWindow[] {
  const windows: TranscriptionWindow[] = [];
  for (let offsetMs = Math.max(0, processedMs); offsetMs < durationMs; offsetMs += windowMs) {
    windows.push({ offsetMs, lengthMs: Math.min(windowMs, durationMs - offsetMs) });
  }
  return windows;
}

/** Moves window-relative segments to media time, clamped to the window. */
export function shiftSegments(segments: Cue[], offsetMs: number, lengthMs: number): Cue[] {
  return segments
    .map((segment) => ({
      startMs: offsetMs + Math.max(0, Math.min(segment.startMs, lengthMs)),
      endMs: offsetMs + Math.max(0, Math.min(segment.endMs, lengthMs)),
      text: segment.text.replace(/\s+/g, ' ').trim(),
    }))
    .filter((segment) => segment.text.length > 0);
}

/** ISO-639-1 code for the Whisper language name used to transcribe. */
export function languageCode(whisperLanguage: string): string {
  const codes: Record<string, string> = {
    portuguese: 'pt',
    english: 'en',
    spanish: 'es',
    french: 'fr',
    german: 'de',
    italian: 'it',
  };
  return codes[whisperLanguage.toLowerCase()] ?? whisperLanguage.slice(0, 2).toLowerCase();
}

/** Decodes a window of a media file as 16 kHz mono float32 samples. Read-only. */
export interface AudioDecoder {
  decodeWindow(absolutePath: string, offsetMs: number, lengthMs: number): Promise<Float32Array>;
}

/** Speech-to-text over 16 kHz mono audio; segments are relative to the audio. */
export interface Transcriber {
  readonly modelId: string;
  transcribe(audio: Float32Array, options: { language: string }): Promise<Cue[]>;
}

export interface TranscriptionCandidate {
  mediaFileId: string;
  sourceId: string;
  absolutePath: string;
  durationMs: number;
  sha256: string | null;
  /** Identity of the file version; a change restarts the transcript. */
  fingerprint: string;
  /** Checkpoint of an interrupted transcription, in ms. */
  processedMs: number;
}

export interface TranscriptionStatus {
  pending: number;
  inProgress: number;
  done: number;
  failed: number;
}

/** Persistence of transcripts. Writes catalog rows only, never media files. */
export interface TranscriptStore {
  /** Videos with a known duration, without subtitles, not yet (fully) transcribed. */
  listPending(sourceId: string, limit: number): Promise<TranscriptionCandidate[]>;
  countPending(sourceId: string): Promise<number>;
  /** Starts (or restarts, when the fingerprint changed) a transcript. */
  begin(candidate: TranscriptionCandidate, model: string, language: string): Promise<number>;
  /** Appends a window's segments and advances the checkpoint atomically. */
  appendWindow(mediaFileId: string, segments: Cue[], processedMs: number): Promise<void>;
  complete(mediaFileId: string): Promise<void>;
  fail(mediaFileId: string, error: string): Promise<void>;
  /**
   * Records an error. Returns true when the transcript already failed before
   * (it is then marked failed and skipped); false on the first error, so the
   * job can retry a transient failure and resume from the checkpoint.
   */
  noteError(mediaFileId: string, error: string): Promise<boolean>;
  /** A finished transcript of an identical file (same sha256), if any. */
  findTranscribedTwin(mediaFileId: string): Promise<string | null>;
  copyFrom(sourceMediaFileId: string, candidate: TranscriptionCandidate): Promise<void>;
  status(): Promise<TranscriptionStatus>;
}
