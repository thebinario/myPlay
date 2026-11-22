import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createMidoteca, type Midoteca } from '../../../../src/index';
import { createTempDatabase, type TempDatabase } from '../../../helpers/temp-db';
import { createTempLibrary, type TempLibrary } from '../../../helpers/temp-library';
import { minimalPdf } from '../../../helpers/minimal-pdf';

const noMediaTools = {
  prober: { probe: async () => ({ durationMs: null }) },
  sampler: { sampleHashes: async () => [] },
};

const SRT = [
  '1',
  '00:00:01,000 --> 00:00:04,000',
  'Nesta aula falamos sobre produção de vídeo.',
  '',
  '2',
  '00:02:00,000 --> 00:02:05,000',
  'Agora vamos configurar o ambiente.',
  '',
].join('\n');

describe('content search (SQLite FTS5 + real files)', () => {
  let temp: TempDatabase;
  let library: TempLibrary;
  let app: Midoteca;

  beforeEach(() => {
    temp = createTempDatabase();
    library = createTempLibrary();
    app = createMidoteca({ databaseFile: temp.file, mediaTools: noMediaTools });
  });

  afterEach(async () => {
    await app.jobRunner.stop();
    app.close();
    temp.cleanup();
    library.cleanup();
  });

  async function scanAndExtract(): Promise<void> {
    const existing = await app.sources.listSources();
    const source = existing[0] ?? (await app.sources.addSource({ rootPath: library.root }));
    await app.indexer.runScan({ sourceId: source.id });
    await app.jobRunner.drain();
  }

  function writePdf(relative: string, pages: string[]): void {
    library.mkdir(relative.split('/').slice(0, -1).join('/'));
    writeFileSync(join(library.root, relative), minimalPdf(pages));
  }

  it('ships SQLite with FTS5 enabled', () => {
    const row = app.database
      .prepare(`SELECT sqlite_compileoption_used('ENABLE_FTS5') AS fts5`)
      .get() as { fts5: number };
    expect(row.fts5).toBe(1);
  });

  it('finds subtitle text ignoring accents and returns the lesson and timestamp', async () => {
    library.write('Curso A/Modulo 1/01 - Intro.mp4', 'video');
    library.write('Curso A/Modulo 1/01 - Intro.pt-BR.srt', SRT);
    await scanAndExtract();

    const hits = await app.contentSearch.search({ text: 'producao de video' });
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({
      sourceKind: 'subtitle',
      startMs: 1_000,
      lessonTitle: expect.any(String),
      courseTitle: expect.stringContaining('Curso A'),
      language: 'pt-br',
    });
    expect(hits[0].lessonId).toBeTruthy();
    expect(hits[0].snippet).toContain('[[produção]]');
  });

  it('finds PDF text with its page and document', async () => {
    writePdf('Curso A/Modulo 1/Apostila.pdf', [
      'Capitulo de abertura',
      'Configuracao do Docker Compose',
    ]);
    await scanAndExtract();

    const hits = await app.contentSearch.search({ text: 'docker comp' });
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ sourceKind: 'pdf', page: 2 });
    expect(hits[0].documentId).toBeTruthy();
  });

  it('re-extracts a subtitle that changed on disk', async () => {
    library.write('Curso A/Modulo 1/01 - Intro.mp4', 'video');
    library.write('Curso A/Modulo 1/01 - Intro.srt', SRT);
    await scanAndExtract();
    expect(await app.contentSearch.search({ text: 'ambiente' })).toHaveLength(1);

    library.write(
      'Curso A/Modulo 1/01 - Intro.srt',
      '1\n00:00:01,000 --> 00:00:02,000\nTexto totalmente novo\n',
      new Date('2030-01-01T00:00:00Z'),
    );
    await scanAndExtract();

    expect(await app.contentSearch.search({ text: 'ambiente' })).toHaveLength(0);
    expect(await app.contentSearch.search({ text: 'totalmente' })).toHaveLength(1);
  });

  it('records a failed extraction without blocking the others', async () => {
    library.write('Curso A/Modulo 1/Corrompido.pdf', 'isto não é um pdf');
    writePdf('Curso A/Modulo 1/Bom.pdf', ['Kubernetes na pratica']);
    await scanAndExtract();

    expect(await app.contentSearch.search({ text: 'kubernetes' })).toHaveLength(1);
    expect(await app.contentSearch.status()).toMatchObject({ indexed: 1, failed: 1 });
  });

  it('returns nothing for blank or syntax-only queries', async () => {
    expect(await app.contentSearch.search({ text: '  "*  ' })).toEqual([]);
  });
});
