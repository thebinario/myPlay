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
/**
 * Containers Chromium cannot open directly but that the core can remux to MP4
 * without re-encoding, as long as the codecs themselves are native.
 */
const REMUXABLE_CONTAINERS = new Set(['mpegts']);
const NATIVE_VIDEO = new Set(['h264', 'vp8', 'vp9', 'av1', 'theora']);
const NATIVE_AUDIO = new Set(['aac', 'mp3', 'opus', 'vorbis', 'flac']);

function formatNames(container: string): string[] {
  return container
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
}

/** Whether the container opens directly in the desktop player. */
export function isNativeContainer(container: string): boolean {
  return formatNames(container).some((name) => NATIVE_CONTAINERS.has(name));
}

/** Whether the core can remux the container to MP4 when codecs are native. */
export function isRemuxableContainer(container: string): boolean {
  return formatNames(container).some((name) => REMUXABLE_CONTAINERS.has(name));
}

export function isNativeVideoCodec(codec: string): boolean {
  return NATIVE_VIDEO.has(codec);
}

export function isNativeAudioCodec(codec: string): boolean {
  return NATIVE_AUDIO.has(codec) || codec.startsWith('pcm_');
}

export function assessPlayability(inspection: MediaInspection): PlayabilityAssessment {
  if (!inspection.readable) return { playability: 'damaged', reason: inspection.error };
  if (!isNativeContainer(inspection.container) && !isRemuxableContainer(inspection.container)) {
    return { playability: 'unsupported', reason: `contêiner ${inspection.container}` };
  }
  if (!inspection.videoCodec) {
    return { playability: 'damaged', reason: 'nenhuma trilha de vídeo legível' };
  }
  if (!isNativeVideoCodec(inspection.videoCodec)) {
    return { playability: 'unsupported', reason: `codec de vídeo ${inspection.videoCodec}` };
  }
  if (inspection.audioCodec && !isNativeAudioCodec(inspection.audioCodec)) {
    return { playability: 'unsupported', reason: `codec de áudio ${inspection.audioCodec}` };
  }
  return { playability: 'playable', reason: null };
}
