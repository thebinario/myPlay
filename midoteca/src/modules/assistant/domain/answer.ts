/**
 * Grounded answers: the assistant may only use the retrieved sources and must
 * cite them as [n]. Citations to sources that were not retrieved are dropped.
 * Pure: retrieval and generation are ports.
 */

export interface PromptSource {
  /** 1-based number shown to the model and to the person. */
  index: number;
  /** Human label, e.g. "Curso · Aula (01:15)" or "Apostila.pdf · página 3". */
  label: string;
  text: string;
}

export const NO_SOURCES_ANSWER =
  'Não encontrei nada sobre isso na sua biblioteca. Tente outras palavras ou verifique se o conteúdo já foi indexado.';

const SYSTEM_PROMPT = [
  'Você é o assistente da Midoteca, uma biblioteca local de cursos, vídeos e PDFs.',
  'Responda em português do Brasil, de forma direta e curta.',
  'Use somente as fontes numeradas fornecidas. Se elas não responderem à pergunta, diga que não encontrou na biblioteca.',
  'Cite as fontes que usar no formato [n], logo após a frase correspondente.',
  'Nunca invente fontes, números de página ou tempos.',
].join(' ');

export function buildPrompt(
  question: string,
  sources: PromptSource[],
): { system: string; user: string } {
  const context = sources
    .map((source) => `[${source.index}] ${source.label}\n${source.text}`)
    .join('\n\n');
  return {
    system: SYSTEM_PROMPT,
    user: `Fontes:\n\n${context}\n\nPergunta: ${question.trim()}`,
  };
}

/** Cited source indexes (1..count), in order of first appearance. */
export function extractCitations(answer: string, count: number): number[] {
  const cited: number[] = [];
  for (const match of answer.matchAll(/\[(\d+(?:\s*,\s*\d+)*)\]/g)) {
    for (const value of match[1].split(',')) {
      const index = Number(value.trim());
      if (index >= 1 && index <= count && !cited.includes(index)) cited.push(index);
    }
  }
  return cited;
}
