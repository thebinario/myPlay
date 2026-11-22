/**
 * Read models do assistente local (RAG no núcleo). O frontend envia a pergunta,
 * mostra o texto em streaming e as citações; não recupera nem gera nada.
 */
export interface AnswerSourceView {
  index: number;
  label: string;
  sourceKind: 'pdf' | 'subtitle' | 'transcript';
  snippet: string;
  lessonId: string | null;
  courseId: string | null;
  documentId: string | null;
  page: number | null;
  startMs: number | null;
}

export interface AnswerView {
  text: string;
  sources: AnswerSourceView[];
  citations: AnswerSourceView[];
}

export interface AssistantScope {
  courseId?: string;
  lessonId?: string;
  documentId?: string;
}

export interface AskHandlers {
  onToken: (token: string) => void;
  onDone: (answer: AnswerView) => void;
  onError: (message: string) => void;
}

export interface AssistantSession {
  cancel(): Promise<void>;
}

export interface AssistantRepository {
  ask(input: { question: string; scope?: AssistantScope }, handlers: AskHandlers): AssistantSession;
}
