import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createMidoteca, type Midoteca } from '../../../../src/index';
import type { AudioDecoder, Transcriber } from '../../../../src/modules/media';
import { createTempDatabase, type TempDatabase } from '../../../helpers/temp-db';
import { createTempLibrary, type TempLibrary } from '../../../helpers/temp-library';

const mediaTools = {
  prober: { probe: async () => ({ durationMs: 40_000 }) },
  sampler: { sampleHashes: async () => [] },
};
const transcriber: Transcriber = {
  modelId: 'fake-whisper',
  transcribe: async () => [{ startMs: 0, endMs: 1_000, text: 'fala' }],
};
/** Decodes every file except the ones whose path contains "Quebrado". */
const audio: AudioDecoder = {
  decodeWindow: async (path) => {
    if (path.includes('Quebrado')) throw new Error('Áudio ilegível: stream truncado');
    return Float32Array.from([0]);
  },
};

/**
 * O catálogo de mídia informa, por vídeo, se ele já foi transcrito ou se a
 * transcrição falhou (com o motivo) — base do selo na lista de aulas.
 */
describe('estado da transcrição no catálogo de mídia (SQLite + arquivos reais)', () => {
  let temp: TempDatabase;
  let library: TempLibrary;
  let app: Midoteca;

  beforeEach(() => {
    temp = createTempDatabase();
    library = createTempLibrary();
    app = createMidoteca({ databaseFile: temp.file, mediaTools, aiTools: { transcriber, audio } });
  });

  afterEach(async () => {
    await app.jobRunner.stop();
    app.close();
    temp.cleanup();
    library.cleanup();
  });

  it('marca o vídeo transcrito, o que falhou (com o motivo) e o que ainda não foi', async () => {
    library.write('Curso A/Modulo 1/01 - Boas-vindas.mp4', 'video-1');
    library.write('Curso A/Modulo 1/02 - Quebrado.mp4', 'video-2');
    const source = await app.sources.addSource({ rootPath: library.root });

    await app.indexer.runScan({ sourceId: source.id });
    const before = await app.media.listBySource(source.id);
    expect(before.map((file) => file.transcription)).toEqual([null, null]);

    await app.jobRunner.drain();
    const byName = Object.fromEntries(
      (await app.media.listBySource(source.id)).map((file) => [
        file.relativePath.split('/').pop(),
        file,
      ]),
    );
    expect(byName['01 - Boas-vindas.mp4']).toMatchObject({
      transcription: 'transcribed',
      transcriptionError: null,
    });
    expect(byName['02 - Quebrado.mp4']).toMatchObject({
      transcription: 'failed',
      transcriptionError: 'Áudio ilegível: stream truncado',
    });
  });
});
