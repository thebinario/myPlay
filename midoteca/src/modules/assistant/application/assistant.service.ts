import { ValidationError } from '../../../core/errors';
import type { RetrievalScope } from '../../search/domain/ports';
import { NO_SOURCES_ANSWER, buildPrompt, extractCitations } from '../domain/answer';
import type { ContextRetriever, LlmClient } from '../domain/ports';
import { numberSources, toPromptSources, type AnswerSource } from '../domain/sources';

export interface AskQuestionInput {
  question: string;
  scope?: RetrievalScope;
}

export interface AskOptions {
  onToken?: (token: string) => void;
  signal?: AbortSignal;
}

export interface AssistantAnswer {
  text: string;
  /** Retrieved passages offered to the model, numbered [1..n]. */
  sources: AnswerSource[];
  /** Subset of `sources` the answer actually cites. */
  citations: AnswerSource[];
}

const MAX_QUESTION_CHARS = 1_000;
const SOURCES_PER_ANSWER = 6;

/**
 * Answers questions about the local library (RAG): retrieves passages, asks the
 * local model to answer only from them citing [n], and keeps only citations to
 * retrieved sources. Without relevant passages it says so without generating.
 */
export class AssistantService {
  constructor(private readonly deps: { retriever: ContextRetriever; llm?: LlmClient }) {}

  get available(): boolean {
    return !!this.deps.llm;
  }

  async ask(input: AskQuestionInput, options: AskOptions = {}): Promise<AssistantAnswer> {
    const question = typeof input.question === 'string' ? input.question.trim() : '';
    if (!question) throw new ValidationError('Field "question" must not be empty');
    if (question.length > MAX_QUESTION_CHARS) {
      throw new ValidationError(
        `Field "question" must have at most ${MAX_QUESTION_CHARS} characters`,
      );
    }

    const sources = numberSources(
      await this.deps.retriever.execute(question, input.scope ?? {}, SOURCES_PER_ANSWER),
    );
    if (sources.length === 0) {
      options.onToken?.(NO_SOURCES_ANSWER);
      return { text: NO_SOURCES_ANSWER, sources: [], citations: [] };
    }
    if (!this.deps.llm) throw new ValidationError('Local assistant model is not available');

    const text = await this.deps.llm.generate(
      buildPrompt(question, toPromptSources(sources)),
      options,
    );
    const cited = extractCitations(text, sources.length);
    return {
      text,
      sources,
      citations: cited.map((index) => sources[index - 1]),
    };
  }
}
