import type { DesktopEvent, MidotecaBridge } from '@/core/contracts/desktop-bridge';
import type {
  AnswerView,
  AskHandlers,
  AssistantRepository,
  AssistantScope,
  AssistantSession,
} from '@/modules/assistant/domain/assistant';

interface AssistantEventPayload {
  requestId?: string;
  token?: string;
  answer?: AnswerView;
  message?: string;
}

/**
 * Adapter IPC do assistente: `assistant.ask` devolve um `requestId` e o núcleo
 * transmite tokens e o resultado como eventos `assistant:*`.
 */
export class IpcAssistantRepository implements AssistantRepository {
  constructor(private readonly bridge: MidotecaBridge) {}

  ask(
    input: { question: string; scope?: AssistantScope },
    handlers: AskHandlers,
  ): AssistantSession {
    let requestId: string | null = null;
    const early: DesktopEvent[] = [];
    let finished = false;

    const handle = (event: DesktopEvent) => {
      const payload = (event.payload ?? {}) as AssistantEventPayload;
      if (payload.requestId !== requestId) return;
      if (event.name === 'assistant:token' && payload.token) handlers.onToken(payload.token);
      if (event.name === 'assistant:done' && payload.answer)
        finish(() => handlers.onDone(payload.answer!));
      if (event.name === 'assistant:error')
        finish(() => handlers.onError(payload.message ?? 'Erro'));
    };

    const detach = this.bridge.onEvent((event) => {
      if (!event.name.startsWith('assistant:')) return;
      if (requestId === null) early.push(event);
      else handle(event);
    });

    function finish(callback: () => void) {
      if (finished) return;
      finished = true;
      detach();
      callback();
    }

    const started = this.bridge
      .invoke('assistant.ask', input)
      .then((result) => {
        requestId = result.requestId;
        early.splice(0).forEach(handle);
      })
      .catch((error: unknown) =>
        finish(() => handlers.onError(error instanceof Error ? error.message : String(error))),
      );

    return {
      cancel: async () => {
        await started;
        if (requestId && !finished) {
          await this.bridge.invoke('assistant.cancel', { requestId });
        }
      },
    };
  }
}
