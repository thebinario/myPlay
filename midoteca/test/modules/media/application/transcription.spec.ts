import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createMidoteca, type Midoteca } from '../../../../src/index';
import type { AudioDecoder, Transcriber } from '../../../../src/modules/media';
import { createTempDatabase, type TempDatabase } from '../../../helpers/temp-db';
import { createTempLibrary, type TempLibrary } from '../../../helpers/temp-library';

/** Fixture videos encode their duration; probe/fingerprint are faked. */
const prober = {
  probe: async (path: string) => ({ durationMs: /longa/.test(path) ? 70_000 : 40_000 }),
};
const sampler = { sampleHashes: async () => [] };

/** Decoder returns a marker sample so the fake transcriber knows the window. */
const decoder: AudioDecoder = {
  decodeWindow: async (_path, offsetMs, lengthMs) => Float32Array.from([offsetMs, lengthMs]),
};

function fakeTranscriber(failAtOffset?: number) {
  const calls: Array<{ offsetMs: number; language: string }> = [];
  let failed = false;
  const transcriber: Transcriber = {
    modelId: 'fake-whisper',
    transcribe: async (audio, { language }) => {
      const offsetMs = audio[0];
      calls.push({ offsetMs, language });
      if (offsetMs === failAtOffset && !failed) {
        failed = true;
        throw new Error('interrompido');
      }
      return [{ startMs: 1_000, endMs: 4_000, text: `fala no instante ${offsetMs / 1000}` }];
    },
  };
  return { transcriber, calls };
}

describe('local transcription (SQLite + fake whisper)', () => {
  let temp: TempDatabase;
  let library: TempLibrary;
  let app: Midoteca;
  let fake: ReturnType<typeof fakeTranscriber>;

  function open(failAtOffset?: number) {
    fake = fakeTranscriber(failAtOffset);
    app = createMidoteca({
      databaseFile: temp.file,
      mediaTools: { prober, sampler },
      aiTools: { transcriber: fake.transcriber, audio: decoder },
    });
  }

  beforeEach(() => {
    temp = createTempDatabase();
    library = createTempLibrary();
  });

  afterEach(async () => {
    await app.jobRunner.stop();
    if (app.database.isOpen) app.close();
    temp.cleanup();
    library.cleanup();
  });

  async function scanAndProcess(): Promise<void> {
    const sources = await app.sources.listSources();
    const source = sources[0] ?? (await app.sources.addSource({ rootPath: library.root }));
    await app.indexer.runScan({ sourceId: source.id });
    await app.jobRunner.drain();
  }

  async function lessonId(courseTitle: string): Promise<string> {
    const page = await app.queries.listCourses({ limit: 50, offset: 0 });
    const course = page.items.find((item) => item.title.includes(courseTitle))!;
    return (await app.courses.getTree(course.id))!.modules[0].lessons[0].id;
  }

  it('transcribes videos without subtitles in 30s windows and makes the text searchable', async () => {
    open();
    library.write('Curso A/Modulo 1/01 - Aula longa.mp4', 'video-a');
    library.write('Curso B/Modulo 1/01 - Com legenda.mp4', 'video-b');
    library.write(
      'Curso B/Modulo 1/01 - Com legenda.srt',
      '1\n00:00:01,000 --> 00:00:02,000\nlegenda\n',
    );

    await scanAndProcess();

    expect(fake.calls.map((call) => call.offsetMs)).toEqual([0, 30_000, 60_000]);
    expect(fake.calls[0].language).toBe('portuguese');
    const hits = await app.contentSearch.search({ text: 'instante 30' });
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ sourceKind: 'transcript', startMs: 31_000 });
    expect(await app.transcription.status()).toMatchObject({ done: 1, pending: 0 });
  });

  it('serves file and generated subtitles to the player through the backend', async () => {
    open();
    library.write('Curso A/Modulo 1/01 - Aula.mp4', 'video-a');
    await scanAndProcess();

    const tracks = await app.subtitles.forLesson(await lessonId('Curso A'));
    expect(tracks).toHaveLength(1);
    expect(tracks[0]).toMatchObject({ generated: true, language: 'pt' });
    expect(tracks[0].cues[0]).toEqual({ startMs: 1_000, endMs: 4_000, text: 'fala no instante 0' });
  });

  it('parses subtitle files for the player (backend is the parser)', async () => {
    open();
    library.write('Curso B/Modulo 1/01 - Aula.mp4', 'video-b');
    library.write(
      'Curso B/Modulo 1/01 - Aula.en.vtt',
      'WEBVTT\n\n00:01.000 --> 00:02.000\nHello\n',
    );
    await scanAndProcess();

    const tracks = await app.subtitles.forLesson(await lessonId('Curso B'));
    expect(tracks).toEqual([
      expect.objectContaining({
        generated: false,
        language: 'en',
        cues: [{ startMs: 1_000, endMs: 2_000, text: 'Hello' }],
      }),
    ]);
  });

  it('resumes an interrupted transcription from the last finished window', async () => {
    open(30_000);
    library.write('Curso A/Modulo 1/01 - Aula longa.mp4', 'video-a');

    await scanAndProcess();

    // Window 0 ok, window 30s failed once (job retried), then resumed at 30s.
    expect(fake.calls.map((call) => call.offsetMs)).toEqual([0, 30_000, 30_000, 60_000]);
    const tracks = await app.subtitles.forLesson(await lessonId('Curso A'));
    expect(tracks[0].cues.map((cue) => cue.startMs)).toEqual([1_000, 31_000, 61_000]);
  });

  it('reuses the transcript of an identical copy instead of transcribing again', async () => {
    open();
    library.write('Curso A/Modulo 1/01 - Aula.mp4', 'same-bytes');
    library.write('Curso B/Modulo 1/01 - Aula.mp4', 'same-bytes');

    await scanAndProcess();

    expect(fake.calls).toHaveLength(2); // 40s video = 2 windows, transcribed once
    const copy = await app.subtitles.forLesson(await lessonId('Curso B'));
    expect(copy[0].cues).toHaveLength(2);
  });

  it('does nothing when local AI is turned off', async () => {
    open();
    await app.settings.set('ai.enabled', false);
    library.write('Curso A/Modulo 1/01 - Aula.mp4', 'video-a');

    await scanAndProcess();

    expect(fake.calls).toHaveLength(0);
  });
});
