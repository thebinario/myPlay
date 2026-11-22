import { describe, expect, it } from 'vitest';
import {
  shiftSegments,
  transcriptionWindows,
} from '../../../../src/modules/media/domain/transcription';

describe('transcriptionWindows', () => {
  it('splits the remaining audio in 30s windows, resuming from the checkpoint', () => {
    expect(transcriptionWindows(95_000, 30_000)).toEqual([
      { offsetMs: 30_000, lengthMs: 30_000 },
      { offsetMs: 60_000, lengthMs: 30_000 },
      { offsetMs: 90_000, lengthMs: 5_000 },
    ]);
  });

  it('returns nothing when everything was processed', () => {
    expect(transcriptionWindows(60_000, 60_000)).toEqual([]);
  });
});

describe('shiftSegments', () => {
  it('moves window-relative segments to media time and drops empty text', () => {
    expect(
      shiftSegments(
        [
          { startMs: 0, endMs: 1_500, text: ' Olá ' },
          { startMs: 2_000, endMs: 2_500, text: '  ' },
          { startMs: 28_000, endMs: 45_000, text: 'fim' },
        ],
        60_000,
        30_000,
      ),
    ).toEqual([
      { startMs: 60_000, endMs: 61_500, text: 'Olá' },
      { startMs: 88_000, endMs: 90_000, text: 'fim' },
    ]);
  });
});
