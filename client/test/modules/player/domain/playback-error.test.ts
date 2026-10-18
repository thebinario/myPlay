import { describe, it, expect } from 'vitest';
import {
  extractFileFormat,
  isFormatNativelySupported,
  classifyPlaybackError,
} from '@/modules/player/domain/playback-error';

describe('player/domain — playback-error', () => {
  describe('extractFileFormat', () => {
    it('extrai extensão de URLs midoteca-media', () => {
      expect(extractFileFormat('midoteca-media://localhost/Users/user/Videos/aula.mkv')).toBe('MKV');
      expect(extractFileFormat('midoteca-media://localhost/C:/Cursos/aula-02.avi')).toBe('AVI');
      expect(extractFileFormat('midoteca-media://localhost/media/video.mp4')).toBe('MP4');
      expect(extractFileFormat('midoteca-media://localhost/media/video.webm')).toBe('WEBM');
    });

    it('extrai extensão de caminhos locais e URLs com query params', () => {
      expect(extractFileFormat('/var/media/aula.WMV?token=123')).toBe('WMV');
      expect(extractFileFormat('file:///path/to/movie.mov')).toBe('MOV');
      expect(extractFileFormat('c:\\videos\\curso.flv')).toBe('FLV');
    });

    it('retorna formato padrão para arquivos sem extensão', () => {
      expect(extractFileFormat('')).toBe('DESCONHECIDO');
      expect(extractFileFormat('http://localhost/video')).toBe('DESCONHECIDO');
    });
  });

  describe('isFormatNativelySupported', () => {
    it('reconhece formatos compatíveis nativamente com HTML5 video', () => {
      expect(isFormatNativelySupported('mp4')).toBe(true);
      expect(isFormatNativelySupported('webm')).toBe(true);
      expect(isFormatNativelySupported('.m4v')).toBe(true);
    });

    it('identifica formatos que não possuem suporte nativo no Chromium', () => {
      expect(isFormatNativelySupported('mkv')).toBe(false);
      expect(isFormatNativelySupported('.avi')).toBe(false);
      expect(isFormatNativelySupported('wmv')).toBe(false);
      expect(isFormatNativelySupported('flv')).toBe(false);
      expect(isFormatNativelySupported('rmvb')).toBe(false);
      expect(isFormatNativelySupported('ts')).toBe(false);
    });
  });

  describe('classifyPlaybackError', () => {
    it('classifica como formato não suportado quando a extensão é incompatível', () => {
      const error = classifyPlaybackError({
        url: 'midoteca-media://localhost/curso/aula.mkv',
        mediaErrorCode: 4, // MEDIA_ERR_SRC_NOT_SUPPORTED
      });

      expect(error.kind).toBe('unsupported_format');
      expect(error.format).toBe('MKV');
      expect(error.title).toMatch(/formato.*não suportado/i);
      expect(error.message).toMatch(/mkv/i);
    });

    it('classifica como formato não suportado para .avi mesmo sem mediaErrorCode', () => {
      const error = classifyPlaybackError({
        url: '/videos/aula.avi',
      });

      expect(error.kind).toBe('unsupported_format');
      expect(error.format).toBe('AVI');
    });

    it('classifica como arquivo corrompido quando mediaErrorCode é MEDIA_ERR_DECODE (3)', () => {
      const error = classifyPlaybackError({
        url: 'midoteca-media://localhost/curso/aula.mp4',
        mediaErrorCode: 3, // MEDIA_ERR_DECODE
      });

      expect(error.kind).toBe('corrupted');
      expect(error.format).toBe('MP4');
      expect(error.title).toMatch(/arquivo corrompido/i);
      expect(error.message).toMatch(/decodificar/i);
    });

    it('classifica como arquivo corrompido quando a mensagem indica falha de decodificação', () => {
      const error = classifyPlaybackError({
        url: 'midoteca-media://localhost/curso/aula.mp4',
        mediaErrorMessage: 'PIPELINE_ERROR_DECODE: corrupted h264 stream',
      });

      expect(error.kind).toBe('corrupted');
    });

    it('classifica como arquivo indisponível / HD desconectado quando isUnavailable for true', () => {
      const error = classifyPlaybackError({
        url: 'midoteca-media://localhost/curso/aula.mp4',
        isUnavailable: true,
      });

      expect(error.kind).toBe('missing');
      expect(error.title).toMatch(/arquivo indisponível ou hd desconectado/i);
    });

    it('classifica como arquivo indisponível quando o status HTTP for 404', () => {
      const error = classifyPlaybackError({
        url: 'midoteca-media://localhost/curso/aula.mp4',
        httpStatus: 404,
      });

      expect(error.kind).toBe('missing');
      expect(error.title).toMatch(/arquivo indisponível ou hd desconectado/i);
    });

    it('classifica como erro de formato quando código é 4 em arquivo que existe', () => {
      const error = classifyPlaybackError({
        url: 'midoteca-media://localhost/curso/aula.mp4',
        mediaErrorCode: 4,
        httpStatus: 200,
      });

      expect(error.kind).toBe('unsupported_format');
      expect(error.format).toBe('MP4');
    });
  });
});
