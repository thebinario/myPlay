/**
 * Shared kernel: a timed line of text (subtitle cue or transcript segment).
 * Used by `media` (player subtitles, transcription) and `search` (indexing).
 */
export interface Cue {
  startMs: number;
  endMs: number;
  text: string;
}

/** Reads subtitle cues from a file (SRT/VTT). Never writes. */
export interface SubtitleReader {
  readCues(absolutePath: string): Promise<Cue[]>;
}
