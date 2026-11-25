import { describe, expect, it } from 'vitest';
import type { StructuredLlm } from '../../../../src/core/structured-llm';
import {
  LlmOrganizationSuggester,
  promptTitles,
} from '../../../../src/modules/courses/infrastructure/llm-organization-suggester';

function recordingLlm(reply: (user: string) => unknown) {
  const calls: Array<{ user: string; schema: Record<string, unknown> }> = [];
  const llm: StructuredLlm = {
    modelId: 'fake',
    generateJson: async (prompt, schema) => {
      calls.push({ user: prompt.user, schema });
      return reply(prompt.user);
    },
  };
  return { llm, calls };
}

describe('promptTitles', () => {
  it('drops numbering, the repeated platform prefix and encoding details', () => {
    expect(
      promptTitles([
        '001 - Hotmart Club - Informações sobre a sala - 2560x1080 4256K',
        '011 - Hotmart Club - Aula 01 - Seja bem-vindo - 2560x1080 4233K',
        '038 - Hotmart Club - Aula 28 - O que movem os juros_ - 2560x1080 915K_2',
        '039 - Websérie - MACRO DRIVERS - Ep.3 - O Ciclo de alta começa - 1080p',
      ]),
    ).toEqual([
      'Informações sobre a sala',
      'Seja bem-vindo',
      'O que movem os juros',
      'Websérie - MACRO DRIVERS - Ep.3 - O Ciclo de alta começa',
    ]);
  });
});

describe('LlmOrganizationSuggester', () => {
  it('asks for 1-based module starts over the numbered lesson list', async () => {
    const { llm, calls } = recordingLlm(() => ({
      modules: [
        { title: 'Lives', start: 1 },
        { title: 'Introdução', start: 3 },
      ],
    }));
    const suggester = new LlmOrganizationSuggester(llm);

    const result = await suggester.suggest(['Live 1', 'Live 2', 'Aula 01 - Boas-vindas']);

    expect(result).toEqual([
      { title: 'Lives', start: 1 },
      { title: 'Introdução', start: 3 },
    ]);
    expect(calls[0].user).toContain('1. Live 1\n2. Live 2\n3. Boas-vindas');
    expect(suggester.modelId).toBe('fake');
  });

  it('splits long courses in windows and shifts the starts back to course positions', async () => {
    const titles = Array.from({ length: 150 }, (_, i) => `Tema ${Math.floor(i / 10)} - parte ${i}`);
    const { llm, calls } = recordingLlm(() => ({
      modules: [
        { title: 'A', start: 1 },
        { title: 'B', start: 11 },
      ],
    }));

    const result = await new LlmOrganizationSuggester(llm).suggest(titles);

    expect(calls).toHaveLength(2);
    expect(result.map((boundary) => boundary.start)).toEqual([1, 11, 76, 86]);
  });

  it('ignores a malformed answer instead of failing the whole course', async () => {
    const { llm } = recordingLlm(() => ({ modules: 'nada' }));
    expect(await new LlmOrganizationSuggester(llm).suggest(['a', 'b'])).toEqual([]);
  });
});
