import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMidoteca, type Midoteca } from '../../../../src/index';
import type { AudioDecoder, Transcriber } from '../../../../src/modules/media';
import type { Job, JobProgressReport } from '../../../../src/modules/jobs';
import { createTempDatabase, type TempDatabase } from '../../../helpers/temp-db';
import { createTempLibrary, type TempLibrary } from '../../../helpers/temp-library';

const prober = { probe: async () => ({ durationMs: 40_000 }) };
const sampler = { sampleHashes: async () => [] };
const audio: AudioDecoder = { decodeWindow: async () => Float32Array.from([0]) };
const transcriber: Transcriber = {
  modelId: 'fake-whisper',
  transcribe: async () => [{ startMs: 0, endMs: 1_000, text: 'fala' }],
};

describe('progresso dos jobs no painel de atividade (SQLite + arquivos reais)', () => {
  let temp: TempDatabase;
  let library: TempLibrary;
  let app: Midoteca;

  beforeEach(() => {
    temp = createTempDatabase();
    library = createTempLibrary();
    app = createMidoteca({
      databaseFile: temp.file,
      mediaTools: { prober, sampler },
      aiTools: { transcriber, audio },
    });
  });

  afterEach(async () => {
    await app.jobRunner.stop();
    app.close();
    temp.cleanup();
    library.cleanup();
  });

  it('cada job informa quantos itens processou, o total e o arquivo atual', async () => {
    library.write('Curso A/Modulo 1/01 - Intro.mp4', 'video-1');
    library.write('Curso A/Modulo 1/02 - Setup.mp4', 'video-2');
    const progress = vi.spyOn(app.activity, 'jobProgress');
    const source = await app.sources.addSource({ rootPath: library.root });
    await app.indexer.runScan({ sourceId: source.id });
    await app.jobRunner.drain();

    const reports = (type: string) =>
      progress.mock.calls
        .filter(([job]: [Job, JobProgressReport]) => job.type === type)
        .map(([, report]) => report);

    expect(reports('media.analyze-source')).toEqual([
      { done: 0, total: 2, detail: '01 - Intro.mp4' },
      { done: 1, total: 2, detail: '02 - Setup.mp4' },
      { done: 2, total: 2, detail: null },
    ]);
    expect(reports('media.transcribe-source')).toEqual([
      { done: 0, total: 2, detail: '01 - Intro.mp4' },
      { done: 1, total: 2, detail: '02 - Setup.mp4' },
      { done: 2, total: 2, detail: null },
    ]);
    const extraction = reports('search.extract-content');
    expect(extraction.length).toBeGreaterThan(0);
    expect(extraction.at(-1)).toMatchObject({ detail: null });
    expect(extraction.at(-1)?.done).toBe(extraction.at(-1)?.total);
  });

  it('expõe o retrato da atividade, vazio quando nada está rodando', async () => {
    await expect(app.activity.snapshot()).resolves.toEqual({
      items: [],
      running: 0,
      queued: 0,
      recent: [],
    });
  });
});
