import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createMidoteca, type Midoteca } from '../../../../src/index';
import type { LlmClient } from '../../../../src/modules/assistant/domain/ports';
import type { StructuredLlm } from '../../../../src/core/structured-llm';
import { createTempDatabase, type TempDatabase } from '../../../helpers/temp-db';
import { createTempLibrary, type TempLibrary } from '../../../helpers/temp-library';

const FIXED_MTIME = new Date('2024-01-01T00:00:00.000Z');

/** Real catalog (SQLite + indexer); only the model is replaced. */
function fakeModel(answer: unknown) {
  const calls: Array<{ user: string; schema: Record<string, unknown> }> = [];
  const llm: LlmClient & StructuredLlm = {
    modelId: 'fake-qwen',
    generate: async () => '',
    generateJson: async (prompt, schema) => {
      calls.push({ user: prompt.user, schema });
      if (answer instanceof Error) throw answer;
      return answer;
    },
  };
  return { llm, calls };
}

describe('AI-suggested course organization', () => {
  let temp: TempDatabase;
  let library: TempLibrary;
  let app: Midoteca;

  beforeEach(() => {
    temp = createTempDatabase();
    library = createTempLibrary();
    library.write('Mesa/001 - Clube - Live 01-09-2023.mp4', 'l1', FIXED_MTIME);
    library.write('Mesa/002 - Clube - Aula 01 - Boas-vindas.mp4', 'a1', FIXED_MTIME);
    library.write('Mesa/003 - Clube - Aula 02 - Instalação.mp4', 'a2', FIXED_MTIME);
    library.write('Mesa/004 - Clube - Aula 03 - Valuation - Métodos.mp4', 'a3', FIXED_MTIME);
    library.write('Mesa/005 - Clube - Aula 04 - Valuation - Múltiplos.mp4', 'a4', FIXED_MTIME);
    library.write('Mesa/Aula 04 - Valuation.pdf', 'pdf', FIXED_MTIME);
  });

  afterEach(() => {
    app.close();
    temp.cleanup();
    library.cleanup();
  });

  async function start(answer: unknown) {
    const model = fakeModel(answer);
    app = createMidoteca({ databaseFile: temp.file, aiTools: { llm: model.llm } });
    const source = await app.sources.addSource({ rootPath: library.root });
    await app.indexer.runScan({ sourceId: source.id });
    await app.jobRunner.drain();
    const courseId = (await app.courses.listBySource(source.id))[0].id;
    return { model, courseId };
  }

  async function lessonIdsByModule(courseId: string) {
    const tree = (await app.courses.getTree(courseId))!;
    return tree.modules.map((module) => ({
      title: module.title,
      lessons: module.lessons.map((lesson) => lesson.relativePath),
      documents: module.documents.map((document) => document.title),
    }));
  }

  const ANSWER = {
    modules: [
      { title: 'Lives', start: 1 },
      { title: 'Introdução', start: 2 },
      { title: 'Valuation', start: 4 },
    ],
  };

  it('queues a job that asks the model for boundaries in file order', async () => {
    const { model, courseId } = await start(ANSWER);

    expect((await app.organizationSuggestions.request(courseId)).status).toBe('pending');
    await app.jobRunner.drain();

    const suggestion = (await app.organizationSuggestions.get(courseId)).suggestion!;
    expect(suggestion.status).toBe('ready');
    expect(suggestion.modelId).toBe('fake-qwen');
    expect(suggestion.modules.map((m) => [m.title, m.lessonIds.length])).toEqual([
      ['Lives', 1],
      ['Introdução', 2],
      ['Valuation', 2],
    ]);
    expect(model.calls).toHaveLength(1);
    expect(model.calls[0].user).toMatch(/1\. .*Live 01-09-2023[\s\S]*5\. .*Valuation - Múltiplos/);
  });

  it('applies it keeping lesson ids and re-linking materials, then forgets it', async () => {
    const { courseId } = await start(ANSWER);
    const before = (await app.courses.getTree(courseId))!.modules.flatMap((m) =>
      m.lessons.map((l) => l.id),
    );
    await app.organizationSuggestions.request(courseId);
    await app.jobRunner.drain();

    await app.organizationSuggestions.apply(courseId);

    expect(await lessonIdsByModule(courseId)).toEqual([
      { title: 'Lives', lessons: ['Mesa/001 - Clube - Live 01-09-2023.mp4'], documents: [] },
      {
        title: 'Introdução',
        lessons: [
          'Mesa/002 - Clube - Aula 01 - Boas-vindas.mp4',
          'Mesa/003 - Clube - Aula 02 - Instalação.mp4',
        ],
        documents: [],
      },
      {
        title: 'Valuation',
        lessons: [
          'Mesa/004 - Clube - Aula 03 - Valuation - Métodos.mp4',
          'Mesa/005 - Clube - Aula 04 - Valuation - Múltiplos.mp4',
        ],
        documents: ['Aula 04 - Valuation'],
      },
    ]);
    const after = (await app.courses.getTree(courseId))!.modules.flatMap((m) =>
      m.lessons.map((l) => l.id),
    );
    expect([...after].sort()).toEqual([...before].sort());
    expect((await app.organizationSuggestions.get(courseId)).suggestion).toBeNull();
  });

  it('keeps the applied organization on rescan (no detected modules come back)', async () => {
    const { courseId } = await start(ANSWER);
    await app.organizationSuggestions.request(courseId);
    await app.jobRunner.drain();
    await app.organizationSuggestions.apply(courseId);
    const applied = await lessonIdsByModule(courseId);

    const sourceId = (await app.sources.listSources())[0].id;
    await app.indexer.runScan({ sourceId });

    expect(await lessonIdsByModule(courseId)).toEqual(applied);
  });

  it('refuses to apply a suggestion made before the course changed', async () => {
    const { courseId } = await start(ANSWER);
    await app.organizationSuggestions.request(courseId);
    await app.jobRunner.drain();
    library.write('Mesa/006 - Clube - Aula 05 - Nova.mp4', 'a5', FIXED_MTIME);
    const sourceId = (await app.sources.listSources())[0].id;
    await app.indexer.runScan({ sourceId });

    await expect(app.organizationSuggestions.apply(courseId)).rejects.toThrow(/mudou/);
  });

  it('records a failure without retrying the model forever', async () => {
    const { model, courseId } = await start(new Error('modelo indisponível'));
    await app.organizationSuggestions.request(courseId);
    await app.jobRunner.drain();

    const suggestion = (await app.organizationSuggestions.get(courseId)).suggestion!;
    expect(suggestion.status).toBe('failed');
    expect(suggestion.error).toContain('modelo indisponível');
    expect(model.calls).toHaveLength(1);
  });

  it('dismisses a suggestion', async () => {
    const { courseId } = await start(ANSWER);
    await app.organizationSuggestions.request(courseId);
    await app.jobRunner.drain();

    await app.organizationSuggestions.dismiss(courseId);

    expect((await app.organizationSuggestions.get(courseId)).suggestion).toBeNull();
  });

  it('is unavailable without a local model', async () => {
    app = createMidoteca({ databaseFile: temp.file });
    expect((await app.organizationSuggestions.get('any')).available).toBe(false);
    await expect(app.organizationSuggestions.request('any')).rejects.toThrow(/IA local/);
  });
});
