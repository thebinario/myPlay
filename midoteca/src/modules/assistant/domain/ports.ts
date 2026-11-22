import type { ContentHit, RetrievalScope } from '../../search/domain/ports';

/** Local text generation (chat model). */
export interface LlmClient {
  readonly modelId: string;
  generate(
    prompt: { system: string; user: string },
    options: { onToken?: (token: string) => void; signal?: AbortSignal },
  ): Promise<string>;
}

/** Finds the library passages relevant to a question. */
export interface ContextRetriever {
  execute(question: string, scope?: RetrievalScope, k?: number): Promise<ContentHit[]>;
}
