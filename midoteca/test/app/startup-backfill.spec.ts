import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createMidoteca, type Midoteca } from '../../src/index';
import type { AudioDecoder, Transcriber } from '../../src/modules/media';
import type { JobStatus } from '../../src/modules/jobs';
import { createTempDatabase, type TempDatabase } from '../helpers/temp-db';
import { createTempLibrary, type TempLibrary } from '../helpers/temp-library';

const mediaTools = {
  prober: { probe: async () => ({ durationMs: 40_000 }) },
  sampler: { sampleHashes: async () => [] },
  inspector: {
    inspect: async () => ({
      readable: true as const,
      container: 'mp4',
      videoCodec: 'h264',
      audioCodec: 'aac',
    }),
  },
};
const audio: AudioDecoder = { decodeWindow: async () => Float32Array.from([0]) };
const transcriber: Transcriber = {
  modelId: 'fake-whisper',
  transcribe: async () => [{ startMs: 0, endMs: 1_000, text: 'fala' }],
};
const STATUSES: JobStatus[] = ['pending', 'running', 'completed', 'failed'];

/**
 * Bibliotecas indexadas antes de a análise, a busca no texto e a transcrição
 * existirem nunca tiveram esses jobs agendados (eles só eram agendados ao fim
 * de um escaneamento). Ao abrir o app, o núcleo precisa retomá-los.
 */
describe('retomada do processamento na abertura do app (SQLite + arquivos reais)', () => {
  let temp: TempDatabase;
  let library: TempLibrary;
  let app: Midoteca | null = null;

  beforeEach(() => {
    temp = createTempDatabase();
    library = createTempLibrary();
  });

  afterEach(async () => {
    await app?.jobRunner.stop();
    app?.close();
    temp.cleanup();
    library.cleanup();
  });

  async function legacyLibrary(): Promise<string> {
    library.write('Curso A/Modulo 1/01 - Intro.mp4', 'video-1');
    library.write('Curso A/Modulo 1/02 - Setup.mp4', 'video-2');
    const legacy = createMidoteca({ databaseFile: temp.file, mediaTools });
    const source = await legacy.sources.addSource({ rootPath: library.root });
    await legacy.indexer.runScan({ sourceId: source.id });
    // Como numa versão antiga: nenhum job de processamento foi agendado.
    legacy.database.prepare('DELETE FROM jobs').run();
    legacy.close();
    return source.id;
  }

  async function jobsOf(instance: Midoteca) {
    const all = (await Promise.all(STATUSES.map((s) => instance.jobs.listByStatus(s)))).flat();
    return all.map((job) => ({ type: job.type, sourceId: job.payload?.sourceId ?? null }));
  }

  it('agenda análise, extração de texto e transcrição de cada biblioteca já indexada', async () => {
    const sourceId = await legacyLibrary();

    app = createMidoteca({
      databaseFile: temp.file,
      mediaTools,
      aiTools: { transcriber, audio },
      backgroundJobs: true,
    });
    await app.jobRunner.drain();

    const jobs = await jobsOf(app);
    for (const type of [
      'media.analyze-source',
      'search.extract-content',
      'media.transcribe-source',
    ]) {
      expect(jobs).toContainEqual({ type, sourceId });
    }
    const status = await app.duplicates.analysisStatus();
    expect(status.pending).toBe(0);
    expect(status.analyzed).toBe(2);
  });

  it('não duplica jobs ao abrir o app de novo com trabalho ainda na fila', async () => {
    const sourceId = await legacyLibrary();
    const opened = createMidoteca({ databaseFile: temp.file, mediaTools, backgroundJobs: true });
    await opened.jobRunner.stop();
    opened.close();

    app = createMidoteca({ databaseFile: temp.file, mediaTools });
    await app.resumeProcessing();
    const analyze = (await app.jobs.listByStatus('pending')).filter(
      (job) => job.type === 'media.analyze-source' && job.payload?.sourceId === sourceId,
    );
    expect(analyze).toHaveLength(1);
  });
});
