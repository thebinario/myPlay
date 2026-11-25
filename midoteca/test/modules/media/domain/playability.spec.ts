import { describe, expect, it } from 'vitest';
import { assessPlayability } from '../../../../src/modules/media/domain/playability';

describe('media/domain — playability', () => {
  it('considera reproduzível VP8/Vorbis em WebM e H.264/AAC em MP4', () => {
    expect(
      assessPlayability({
        readable: true,
        container: 'matroska,webm',
        videoCodec: 'vp8',
        audioCodec: 'vorbis',
      }),
    ).toEqual({ playability: 'playable', reason: null });
    expect(
      assessPlayability({
        readable: true,
        container: 'mov,mp4,m4a,3gp,3g2,mj2',
        videoCodec: 'h264',
        audioCodec: 'aac',
      }),
    ).toEqual({ playability: 'playable', reason: null });
  });

  it('aceita vídeo sem trilha de áudio', () => {
    expect(
      assessPlayability({
        readable: true,
        container: 'matroska,webm',
        videoCodec: 'vp9',
        audioCodec: null,
      }),
    ).toMatchObject({ playability: 'playable' });
  });

  it('marca como danificado o arquivo que o ffprobe não consegue ler', () => {
    expect(
      assessPlayability({ readable: false, error: 'Invalid data found when processing input' }),
    ).toEqual({
      playability: 'damaged',
      reason: 'Invalid data found when processing input',
    });
  });

  it('marca como danificado o arquivo legível sem nenhuma trilha de vídeo', () => {
    expect(
      assessPlayability({
        readable: true,
        container: 'matroska,webm',
        videoCodec: null,
        audioCodec: null,
      }),
    ).toMatchObject({ playability: 'damaged' });
  });

  it('marca como não suportado o codec que o Chromium não decodifica (HEVC, AC-3)', () => {
    expect(
      assessPlayability({
        readable: true,
        container: 'matroska,webm',
        videoCodec: 'hevc',
        audioCodec: 'aac',
      }),
    ).toEqual({ playability: 'unsupported', reason: 'codec de vídeo hevc' });
    expect(
      assessPlayability({
        readable: true,
        container: 'mov,mp4,m4a,3gp,3g2,mj2',
        videoCodec: 'h264',
        audioCodec: 'ac3',
      }),
    ).toEqual({ playability: 'unsupported', reason: 'codec de áudio ac3' });
  });

  it('marca como não suportado o contêiner que o Chromium não abre (AVI)', () => {
    expect(
      assessPlayability({
        readable: true,
        container: 'avi',
        videoCodec: 'h264',
        audioCodec: 'mp3',
      }),
    ).toEqual({ playability: 'unsupported', reason: 'contêiner avi' });
  });

  it('considera reproduzível MPEG-TS com codecs nativos (remux para MP4)', () => {
    expect(
      assessPlayability({
        readable: true,
        container: 'mpegts',
        videoCodec: 'h264',
        audioCodec: 'aac',
      }),
    ).toEqual({ playability: 'playable', reason: null });
  });

  it('mantém como não suportado MPEG-TS com codec que o Chromium não decodifica', () => {
    expect(
      assessPlayability({
        readable: true,
        container: 'mpegts',
        videoCodec: 'mpeg2video',
        audioCodec: 'mp2',
      }),
    ).toEqual({ playability: 'unsupported', reason: 'codec de vídeo mpeg2video' });
  });
});
