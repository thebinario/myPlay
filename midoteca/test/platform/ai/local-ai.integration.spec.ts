import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FfmpegAudioDecoder } from '../../../src/platform/media/ffmpeg-audio-decoder';
import { WhisperTranscriber } from '../../../src/platform/ai/whisper-transcriber';

const SPEECH = join(__dirname, '..', '..', 'fixtures', 'speech-pt.wav');

describe('ffmpeg audio decoder (real binary)', () => {
  it('decodes a window as 16 kHz mono float32', async () => {
    const audio = await new FfmpegAudioDecoder().decodeWindow(SPEECH, 2_000, 3_000);
    expect(audio.length).toBe(48_000);
    expect(Math.max(...audio.map(Math.abs))).toBeGreaterThan(0.01);
  });

  it('returns a short buffer for the last partial window', async () => {
    const audio = await new FfmpegAudioDecoder().decodeWindow(SPEECH, 8_000, 30_000);
    expect(audio.length).toBeGreaterThan(0);
    expect(audio.length).toBeLessThan(16_000 * 2);
  });
});

/**
 * Downloads whisper-base (~80 MB) on first run; opt-in to keep CI offline:
 *   MIDOTECA_AI_IT=1 npx vitest run test/platform/ai
 */
describe.runIf(process.env.MIDOTECA_AI_IT === '1')('whisper transcriber (real model)', () => {
  it('transcribes Portuguese speech with timestamps', async () => {
    const cacheDir =
      process.env.MIDOTECA_AI_CACHE ?? mkdtempSync(join(tmpdir(), 'midoteca-models-'));
    try {
      const audio = await new FfmpegAudioDecoder().decodeWindow(SPEECH, 0, 30_000);
      const cues = await new WhisperTranscriber({ cacheDir }).transcribe(audio, {
        language: 'portuguese',
      });
      const text = cues
        .map((cue) => cue.text)
        .join(' ')
        .toLowerCase();
      expect(text).toContain('ambiente de produção');
      expect(cues[0].startMs).toBeGreaterThanOrEqual(0);
    } finally {
      if (!process.env.MIDOTECA_AI_CACHE) rmSync(cacheDir, { recursive: true, force: true });
    }
  }, 300_000);
});
