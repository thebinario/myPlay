/**
 * Whether the desktop player (Chromium inside Electron) can play a video file,
 * decided by the core from what ffprobe reads. Pure domain rule.
 *
 * - `playable`: container and codecs Chromium decodes natively.
 * - `unsupported`: readable, but a codec/container Chromium does not decode
 *   (candidate for conversion).
 * - `damaged`: unreadable (truncated download, zeroed head, not a media file).
 */
export type MediaPlayability = 'playable' | 'unsupported' | 'damaged';

export const MEDIA_PLAYABILITIES: readonly MediaPlayability[] = [
  'playable',
  'unsupported',
  'damaged',
];

/** What an inspector (ffprobe) read from the file. */
export type MediaInspection =
  | { readable: true; container: string; videoCodec: string | null; audioCodec: string | null }
  | { readable: false; error: string };

/** Reads container/codecs of a file without decoding it (read-only). */
export interface MediaInspector {
  inspect(absolutePath: string): Promise<MediaInspection>;
}

/** A video waiting for (or due a new) playability check. */
export interface PlayabilityCandidate {
  id: string;
  absolutePath: string;
}

export interface PlayabilityStore {
  /** Available videos never checked (or invalidated by a file change). */
  listUnchecked(limit: number): Promise<PlayabilityCandidate[]>;
  countUnchecked(): Promise<number>;
  /** `assessment` null = the inspector failed; recorded so it is not retried in a loop. */
  save(id: string, assessment: PlayabilityAssessment | null, error?: string): Promise<void>;
}

export interface PlayabilityAssessment {
  playability: MediaPlayability;
  reason: string | null;
}

/** ffprobe `format_name` lists: any of these names opens natively. */
const NATIVE_CONTAINERS = new Set(['mov', 'mp4', 'm4a', 'matroska', 'webm', 'ogg']);
const NATIVE_VIDEO = new Set(['h264', 'vp8', 'vp9', 'av1', 'theora']);
const NATIVE_AUDIO = new Set(['aac', 'mp3', 'opus', 'vorbis', 'flac']);

function isNativeAudio(codec: string): boolean {
  return NATIVE_AUDIO.has(codec) || codec.startsWith('pcm_');
}

export function assessPlayability(inspection: MediaInspection): PlayabilityAssessment {
  if (!inspection.readable) return { playability: 'damaged', reason: inspection.error };
  const containers = inspection.container.split(',');
  if (!containers.some((name) => NATIVE_CONTAINERS.has(name))) {
    return { playability: 'unsupported', reason: `contêiner ${inspection.container}` };
  }
  if (!inspection.videoCodec) {
    return { playability: 'damaged', reason: 'nenhuma trilha de vídeo legível' };
  }
  if (!NATIVE_VIDEO.has(inspection.videoCodec)) {
    return { playability: 'unsupported', reason: `codec de vídeo ${inspection.videoCodec}` };
  }
  if (inspection.audioCodec && !isNativeAudio(inspection.audioCodec)) {
    return { playability: 'unsupported', reason: `codec de áudio ${inspection.audioCodec}` };
  }
  return { playability: 'playable', reason: null };
}
