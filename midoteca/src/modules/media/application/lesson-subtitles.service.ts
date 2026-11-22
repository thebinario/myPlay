import type { Cue, SubtitleReader } from '../../../core/domain/subtitles';
import { assertNonEmptyString } from '../../../core/validation';

/** A subtitle track ready for the player: the backend already parsed the cues. */
export interface SubtitleTrackView {
  id: string;
  /** ISO-639-1 language code when known (e.g. `pt`, `en`). */
  language: string | null;
  /** True for transcripts generated locally (Whisper). */
  generated: boolean;
  cues: Cue[];
}

export interface LessonSubtitleSources {
  files: Array<{ trackId: string; language: string | null; absolutePath: string }>;
  transcript: { mediaFileId: string; language: string } | null;
}

/** Locates the subtitle files and transcript of a lesson's primary media. */
export interface LessonSubtitleLookup {
  find(lessonId: string): Promise<LessonSubtitleSources>;
}

export interface TranscriptCues {
  readCues(mediaFileId: string): Promise<Cue[]>;
}

export interface LessonSubtitlesDependencies {
  lookup: LessonSubtitleLookup;
  files: SubtitleReader;
  transcripts: TranscriptCues;
}

/**
 * Subtitles of a lesson for the player: subtitle files next to the video and
 * the local transcript, parsed by the backend. Unreadable files are skipped.
 */
export class LessonSubtitlesService {
  constructor(private readonly deps: LessonSubtitlesDependencies) {}

  async forLesson(lessonId: string): Promise<SubtitleTrackView[]> {
    const sources = await this.deps.lookup.find(assertNonEmptyString(lessonId, 'lessonId'));
    const tracks: SubtitleTrackView[] = [];
    for (const file of sources.files) {
      const cues = await this.deps.files.readCues(file.absolutePath).catch(() => []);
      if (cues.length > 0) {
        tracks.push({ id: file.trackId, language: file.language, generated: false, cues });
      }
    }
    if (sources.transcript) {
      const cues = await this.deps.transcripts.readCues(sources.transcript.mediaFileId);
      if (cues.length > 0) {
        tracks.push({
          id: `transcript:${sources.transcript.mediaFileId}`,
          language: sources.transcript.language,
          generated: true,
          cues,
        });
      }
    }
    return tracks;
  }
}
