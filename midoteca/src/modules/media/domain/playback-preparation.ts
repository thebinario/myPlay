import {
  isNativeAudioCodec,
  isNativeContainer,
  isNativeVideoCodec,
  isRemuxableContainer,
  type MediaInspection,
} from './playability';

/**
 * How the desktop protocol should serve a video to Chromium.
 *
 * - `direct`: the file already uses a container/codecs Chromium decodes.
 * - `remux`: the codecs are native but the container is not; copy the streams
 *   into MP4 (lossless and fast, without touching the source file).
 */
export type PlaybackPreparationMode = 'direct' | 'remux';

/**
 * Extensions that may need a remux. Checked before running ffprobe so native
 * files (MP4, WebM, PDFs, subtitles...) are served without any inspection.
 */
const PREPARABLE_EXTENSIONS = new Set(['.ts']);

export function isPreparableExtension(extension: string): boolean {
  const normalized = extension.startsWith('.')
    ? extension.toLowerCase()
    : `.${extension.toLowerCase()}`;
  return PREPARABLE_EXTENSIONS.has(normalized);
}

export interface PlaybackPreparationPlan {
  mode: PlaybackPreparationMode;
  /** Why the file cannot be served directly; null when it can. */
  reason: string | null;
}

/**
 * Pure rule deciding whether a video needs a lossless remux before playback.
 * Files with non-native codecs are left untouched so the player shows the
 * domain verdict (`unsupported`) instead of a broken stream.
 */
export function planPlaybackPreparation(inspection: MediaInspection): PlaybackPreparationPlan {
  if (!inspection.readable) return { mode: 'direct', reason: inspection.error };
  if (isNativeContainer(inspection.container)) return { mode: 'direct', reason: null };
  if (!isRemuxableContainer(inspection.container)) {
    return { mode: 'direct', reason: `contêiner ${inspection.container}` };
  }
  if (!inspection.videoCodec) {
    return { mode: 'direct', reason: 'nenhuma trilha de vídeo legível' };
  }
  if (!isNativeVideoCodec(inspection.videoCodec)) {
    return { mode: 'direct', reason: `codec de vídeo ${inspection.videoCodec}` };
  }
  if (inspection.audioCodec && !isNativeAudioCodec(inspection.audioCodec)) {
    return { mode: 'direct', reason: `codec de áudio ${inspection.audioCodec}` };
  }
  return { mode: 'remux', reason: `contêiner ${inspection.container}` };
}
