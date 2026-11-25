/**
 * Local language model constrained to answer with JSON that matches a schema
 * (grammar-guided decoding). Shared contract: any bounded context that needs a
 * structured decision from the model depends on this, never on the adapter.
 */
export interface StructuredLlm {
  readonly modelId: string;
  generateJson(
    prompt: { system: string; user: string },
    schema: Record<string, unknown>,
    options?: { maxTokens?: number; signal?: AbortSignal },
  ): Promise<unknown>;
}

export function isStructuredLlm(value: unknown): value is StructuredLlm {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Partial<StructuredLlm>).generateJson === 'function'
  );
}
