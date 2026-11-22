import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createMidoteca, type Midoteca } from '../../../../src/index';
import type { Embedder } from '../../../../src/modules/search';
import type { LlmClient } from '../../../../src/modules/assistant';
import { createTempDatabase, type TempDatabase } from '../../../helpers/temp-db';
import { createTempLibrary, type TempLibrary } from '../../../helpers/temp-library';
import { minimalPdf } from '../../../helpers/minimal-pdf';

/** Deterministic bag-of-words embedder (accent-insensitive), 64 dimensions. */
function vectorOf(text: string): Float32Array {
  const vector = new Float32Array(64);
  for (const word of text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').split(/\W+/)) {
    if (word.length < 3) continue;
    let hash = 0;
    for (const char of word) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    vector[hash % 64] += 1;
  }
  return vector;
}

const embedder: Embedder = {
  modelId: 'fake-bow-64',
  embedPassages: async (texts) => texts.map(vectorOf),
  embedQuery: async (text) => vectorOf(text),
};

function fakeLlm() {
  const prompts: string[] = [];
  const llm: LlmClient = {
    modelId: 'fake-llm',
    generate: async ({ user }, { onToken }) => {
      prompts.push(user);
      const answer = 'Use o instalador oficial [1]. Detalhes no material [2].';
      for (const token of answer.split(/(?<= )/)) onToken?.(token);
      return answer;
    },
  };
  return { llm, prompts };
}

const DOCKER_SRT = [
  '1',
  '00:01:15,000 --> 00:01:20,000',
  'Para instalar o Docker no Windows use o instalador oficial.',
  '',
].join('\n');

describe('assistant (RAG over the local library)', () => {
  let temp: TempDatabase;
  let library: TempLibrary;
  let app: Midoteca;
  let fake: ReturnType<typeof fakeLlm>;

  beforeEach(async () => {
    temp = createTempDatabase();
    library = createTempLibrary();
    fake = fakeLlm();
    app = createMidoteca({
      databaseFile: temp.file,
      mediaTools: { prober: { probe: async () => ({ durationMs: null }) } },
      aiTools: { embedder, llm: fake.llm },
    });
    library.write('Curso Docker/Modulo 1/01 - Instalação.mp4', 'video');
    library.write('Curso Docker/Modulo 1/01 - Instalação.srt', DOCKER_SRT);
    library.mkdir('Curso Kube/Modulo 1');
    writeFileSync(
      join(library.root, 'Curso Kube/Modulo 1/Apostila.pdf'),
      minimalPdf(['Introducao', 'Instalar o Docker Desktop antes do Kubernetes']),
    );
    const source = await app.sources.addSource({ rootPath: library.root });
    await app.indexer.runScan({ sourceId: source.id });
    await app.jobRunner.drain();
  });

  afterEach(async () => {
    await app.jobRunner.stop();
    app.close();
    temp.cleanup();
    library.cleanup();
  });

  it('embeds every extracted chunk in the background', async () => {
    const status = await app.contentSearch.status();
    const embedded = app.database
      .prepare(`SELECT COUNT(*) AS n FROM chunk_embeddings WHERE model = 'fake-bow-64'`)
      .get() as { n: number };
    expect(embedded.n).toBe(status.chunks);
    expect(embedded.n).toBeGreaterThan(0);
  });

  it('answers from retrieved sources, streams tokens and returns clickable citations', async () => {
    const tokens: string[] = [];
    const answer = await app.assistant.ask(
      { question: 'Como instalar o Docker?' },
      { onToken: (token) => tokens.push(token) },
    );

    expect(tokens.join('')).toBe(answer.text);
    expect(fake.prompts[0]).toContain('[1]');
    expect(fake.prompts[0]).toContain('Pergunta: Como instalar o Docker?');
    expect(answer.citations.map((citation) => citation.index)).toEqual([1, 2]);
    const kinds = answer.citations.map((citation) => citation.sourceKind).sort();
    expect(kinds).toEqual(['pdf', 'subtitle']);
    const video = answer.citations.find((citation) => citation.sourceKind === 'subtitle')!;
    expect(video).toMatchObject({ startMs: 75_000, lessonId: expect.any(String) });
    const pdf = answer.citations.find((citation) => citation.sourceKind === 'pdf')!;
    expect(pdf).toMatchObject({ page: 2, documentId: expect.any(String) });
  });

  it('restricts sources to the requested course', async () => {
    const courses = await app.queries.listCourses({ limit: 10, offset: 0 });
    const docker = courses.items.find((course) => course.title.includes('Docker'))!;

    const answer = await app.assistant.ask({
      question: 'Como instalar o Docker?',
      scope: { courseId: docker.id },
    });

    expect(answer.sources.every((source) => source.courseId === docker.id)).toBe(true);
  });

  it('says it found nothing without calling the model when no source matches', async () => {
    const answer = await app.assistant.ask({ question: 'receita de bolo de cenoura' });
    expect(answer.text).toMatch(/não encontrei/i);
    expect(answer.citations).toEqual([]);
    expect(fake.prompts).toHaveLength(0);
  });
});
