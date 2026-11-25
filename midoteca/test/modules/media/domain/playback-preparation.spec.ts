import { describe, expect, it } from 'vitest';
import {
  isPreparableExtension,
  planPlaybackPreparation,
} from '../../../../src/modules/media/domain/playback-preparation';

describe('media/domain — playback preparation', () => {
  it('serve MP4 com H.264/AAC diretamente', () => {
    expect(
      planPlaybackPreparation({
        readable: true,
        container: 'mov,mp4,m4a,3gp,3g2,mj2',
        videoCodec: 'h264',
        audioCodec: 'aac',
      }),
    ).toEqual({ mode: 'direct', reason: null });
  });

  it('remuxa MPEG-TS com codecs nativos para MP4', () => {
    expect(
      planPlaybackPreparation({
        readable: true,
        container: 'mpegts',
        videoCodec: 'h264',
        audioCodec: 'aac',
      }),
    ).toEqual({ mode: 'remux', reason: 'contêiner mpegts' });
  });

  it('não remuxa MPEG-TS com codec não suportado (o player deve diagnosticar)', () => {
    expect(
      planPlaybackPreparation({
        readable: true,
        container: 'mpegts',
        videoCodec: 'mpeg2video',
        audioCodec: 'mp2',
      }),
    ).toEqual({ mode: 'direct', reason: 'codec de vídeo mpeg2video' });
  });

  it('não prepara arquivo ilegível nem contêiner desconhecido', () => {
    expect(
      planPlaybackPreparation({
        readable: false,
        error: 'Invalid data found when processing input',
      }),
    ).toEqual({ mode: 'direct', reason: 'Invalid data found when processing input' });
    expect(
      planPlaybackPreparation({
        readable: true,
        container: 'avi',
        videoCodec: 'h264',
        audioCodec: 'mp3',
      }),
    ).toEqual({ mode: 'direct', reason: 'contêiner avi' });
  });

  it('só inspeciona extensões que podem precisar de remux', () => {
    expect(isPreparableExtension('.ts')).toBe(true);
    expect(isPreparableExtension('TS')).toBe(true);
    expect(isPreparableExtension('.mp4')).toBe(false);
    expect(isPreparableExtension('.pdf')).toBe(false);
  });
});
