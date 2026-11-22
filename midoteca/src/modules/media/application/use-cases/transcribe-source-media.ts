import {
  shiftSegments,
  transcriptionWindows,
  type AudioDecoder,
  type Transcriber,
  type TranscriptStore,
} from '../../domain/transcription';

export interface TranscribeSourceMediaDependencies {
  store: TranscriptStore;
  audio: AudioDecoder;
  transcriber: Transcriber;
}

export interface TranscriptionPacing {
  /** Waits while media is playing: transcription never competes with playback. */
  waitForIdle(): Promise<void>;
  signal?: AbortSignal;
}

const BATCH_SIZE = 5;

/**
 * Transcribes, window by window, the videos of a source that have no subtitle.
 * Each window is persisted with its checkpoint, so an interruption resumes at
 * the last finished window. Identical copies (same sha256) reuse a finished
 * transcript instead of spending CPU again. Media files are only read.
 */
export class TranscribeSourceMedia {
  constructor(private readonly deps: TranscribeSourceMediaDependencies) {}

  async execute(sourceId: string, language: string, pacing: TranscriptionPacing): Promise<number> {
    const { store, audio, transcriber } = this.deps;
    let transcribed = 0;
    for (;;) {
      const batch = await store.listPending(sourceId, BATCH_SIZE);
      if (batch.length === 0) return transcribed;
      for (const candidate of batch) {
        if (pacing.signal?.aborted) return transcribed;

        const twin =
          candidate.processedMs === 0
            ? await store.findTranscribedTwin(candidate.mediaFileId)
            : null;
        if (twin) {
          await store.copyFrom(twin, candidate);
          transcribed += 1;
          continue;
        }

        const startMs = await store.begin(candidate, transcriber.modelId, language);
        try {
          for (const window of transcriptionWindows(candidate.durationMs, startMs)) {
            if (pacing.signal?.aborted) return transcribed;
            await pacing.waitForIdle();
            const samples = await audio.decodeWindow(
              candidate.absolutePath,
              window.offsetMs,
              window.lengthMs,
            );
            const segments = await transcriber.transcribe(samples, { language });
            await store.appendWindow(
              candidate.mediaFileId,
              shiftSegments(segments, window.offsetMs, window.lengthMs),
              window.offsetMs + window.lengthMs,
            );
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (await store.noteError(candidate.mediaFileId, message)) continue;
          throw error;
        }
        await store.complete(candidate.mediaFileId);
        transcribed += 1;
      }
    }
  }
}
