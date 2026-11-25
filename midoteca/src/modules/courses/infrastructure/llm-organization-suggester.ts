import type { StructuredLlm } from '../../../core/structured-llm';
import type { SuggestedBoundary } from '../domain/organization-suggestion';
import type { OrganizationSuggester } from '../domain/suggestion-ports';

/**
 * Asks the local model where each module starts. Measured on a real 106-lesson
 * flat course: small models cannot place boundaries in one long list, but a
 * numbered list with a bounded module count and grammar-constrained JSON gives
 * ordered, sensibly named modules (Qwen 2.5 7B: ~4 s on GPU). Long courses are
 * split in windows so the list stays within what the model handles.
 */

const WINDOW = 120;
const SEPARATOR = /\s+[-–]\s+/;
const TECHNICAL = /^(?:\d{3,5}x\d{3,5}(?:\s+\d+k)?(?:_\d+)?|\d{3,4}[pi]|audio)$/i;
const LESSON_NUMBER = /^aula\s*\d+$/i;

const SYSTEM = 'Você é um organizador de cursos. Responda somente com JSON válido.';

/** Lesson titles as the model should read them: only what carries meaning. */
export function promptTitles(titles: readonly string[]): string[] {
  const parts = titles.map((title) =>
    title
      .replace(/^\d+\s*[-.]?\s*/, '')
      .split(SEPARATOR)
      .map((part) => part.replace(/_+\d*$/, '').trim())
      .filter((part) => part !== '' && !TECHNICAL.test(part)),
  );
  const counts = new Map<string, number>();
  for (const segments of parts) {
    if (segments.length > 1) counts.set(segments[0], (counts.get(segments[0]) ?? 0) + 1);
  }
  const platform = [...counts].find(([, count]) => count >= titles.length / 2)?.[0];
  return parts.map((segments, index) => {
    let rest = segments;
    if (rest.length > 1 && rest[0] === platform) rest = rest.slice(1);
    if (rest.length > 1 && LESSON_NUMBER.test(rest[0])) rest = rest.slice(1);
    return rest.join(' - ') || titles[index];
  });
}

function prompt(titles: readonly string[], min: number, max: number): string {
  return `Este curso tem ${titles.length} aulas em sequência, sem divisão em módulos:

${titles.map((title, index) => `${index + 1}. ${title}`).join('\n')}

Agrupe as aulas em ${min} a ${max} MÓDULOS por assunto. Cada módulo reúne VÁRIAS aulas consecutivas (em geral 5 a 15).
Não crie um módulo por aula e não copie títulos de aulas: dê a cada módulo um nome curto de assunto (2 a 5 palavras).
Informe para cada módulo o número da sua primeira aula; os números devem ser crescentes e o primeiro é 1.
Formato: {"modules":[{"title":"Lives","start":1},{"title":"Introdução","start":11}]}`;
}

function schema(min: number, max: number): Record<string, unknown> {
  return {
    type: 'object',
    properties: {
      modules: {
        type: 'array',
        minItems: min,
        maxItems: max,
        items: {
          type: 'object',
          properties: { title: { type: 'string' }, start: { type: 'integer' } },
        },
      },
    },
  };
}

function parseBoundaries(answer: unknown): SuggestedBoundary[] {
  const modules = (answer as { modules?: unknown })?.modules;
  if (!Array.isArray(modules)) return [];
  return modules.flatMap((item) => {
    const { title, start } = (item ?? {}) as { title?: unknown; start?: unknown };
    return typeof title === 'string' && typeof start === 'number' ? [{ title, start }] : [];
  });
}

export class LlmOrganizationSuggester implements OrganizationSuggester {
  constructor(private readonly llm: StructuredLlm) {}

  get modelId(): string {
    return this.llm.modelId;
  }

  async suggest(
    lessonTitles: readonly string[],
    signal?: AbortSignal,
  ): Promise<SuggestedBoundary[]> {
    const titles = promptTitles(lessonTitles);
    const windows = Math.max(1, Math.ceil(titles.length / WINDOW));
    const size = Math.ceil(titles.length / windows);
    const boundaries: SuggestedBoundary[] = [];
    for (let offset = 0; offset < titles.length; offset += size) {
      const slice = titles.slice(offset, offset + size);
      const min = Math.max(1, Math.min(8, Math.round(slice.length / 14)));
      const max = Math.max(min, Math.min(14, Math.round(slice.length / 5)));
      const answer = await this.llm.generateJson(
        { system: SYSTEM, user: prompt(slice, min, max) },
        schema(min, max),
        { maxTokens: 700, signal },
      );
      for (const boundary of parseBoundaries(answer)) {
        if (boundary.start >= 1 && boundary.start <= slice.length) {
          boundaries.push({ title: boundary.title, start: boundary.start + offset });
        }
      }
    }
    return boundaries;
  }
}
