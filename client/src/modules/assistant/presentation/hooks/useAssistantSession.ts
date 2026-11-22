import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  AnswerView,
  AssistantScope,
  AssistantSession,
} from '@/modules/assistant/domain/assistant';
import { useAssistantRepository } from '@/modules/assistant/presentation/AssistantProvider';

type Status = 'idle' | 'answering' | 'done' | 'error';

/** Estado transitório de uma pergunta ao assistente (streaming, resultado, erro). */
export function useAssistantSession(scope?: AssistantScope) {
  const repository = useAssistantRepository();
  const [status, setStatus] = useState<Status>('idle');
  const [streamed, setStreamed] = useState('');
  const [answer, setAnswer] = useState<AnswerView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const session = useRef<AssistantSession | null>(null);

  const ask = useCallback(
    (question: string) => {
      if (!repository || !question.trim()) return;
      void session.current?.cancel();
      setStatus('answering');
      setStreamed('');
      setAnswer(null);
      setError(null);
      session.current = repository.ask(
        { question: question.trim(), scope },
        {
          onToken: (token) => setStreamed((text) => text + token),
          onDone: (result) => {
            setAnswer(result);
            setStatus('done');
          },
          onError: (message) => {
            setError(message);
            setStatus('error');
          },
        },
      );
    },
    [repository, scope],
  );

  const cancel = useCallback(() => {
    void session.current?.cancel();
  }, []);

  useEffect(() => () => void session.current?.cancel(), []);

  return { available: !!repository, status, streamed, answer, error, ask, cancel };
}
