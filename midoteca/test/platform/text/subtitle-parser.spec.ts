import { describe, expect, it } from 'vitest';
import { parseSubtitles } from '../../../src/platform/text/subtitle-parser';

describe('parseSubtitles', () => {
  it('parses SRT (CRLF, multi-line cues, formatting tags)', () => {
    const srt = [
      '1',
      '00:00:01,000 --> 00:00:04,500',
      'Olá, <i>mundo</i>!',
      '',
      '2',
      '00:01:02,250 --> 00:01:05,000',
      'Primeira linha',
      'segunda linha',
      '',
    ].join('\r\n');
    expect(parseSubtitles(srt)).toEqual([
      { startMs: 1_000, endMs: 4_500, text: 'Olá, mundo!' },
      { startMs: 62_250, endMs: 65_000, text: 'Primeira linha segunda linha' },
    ]);
  });

  it('parses WebVTT (header, optional hours, cue settings, BOM)', () => {
    const vtt =
      '﻿WEBVTT\n\nNOTE comentário\n\nintro\n00:05.000 --> 00:07.000 align:start\n<v Ana>Produção</v> de vídeo\n\n01:00:00.000 --> 01:00:02.000\nFim\n';
    expect(parseSubtitles(vtt)).toEqual([
      { startMs: 5_000, endMs: 7_000, text: 'Produção de vídeo' },
      { startMs: 3_600_000, endMs: 3_602_000, text: 'Fim' },
    ]);
  });

  it('ignores malformed blocks', () => {
    expect(parseSubtitles('lixo\n\n1\nsem tempo\ntexto\n')).toEqual([]);
  });
});
