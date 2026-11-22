import { describe, expect, it, vi } from 'vitest';
import type { DesktopEvent, MidotecaBridge } from '@/core/contracts/desktop-bridge';
import { IpcAssistantRepository } from '@/modules/assistant/infrastructure/ipc/ipc-assistant.repository';

function fakeBridge() {
  const listeners = new Set<(event: DesktopEvent) => void>();
  const invoke = vi.fn(async (method: string) => {
    if (method === 'assistant.ask') return { requestId: 'r1' };
    if (method === 'assistant.cancel') return { cancelled: true };
    throw new Error(method);
  });
  const bridge = {
    invoke,
    onEvent: (listener: (event: DesktopEvent) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    pickDirectory: async () => null,
  } as unknown as MidotecaBridge;
  const emit = (name: string, payload: unknown) =>
    listeners.forEach((listener) => listener({ name, payload } as unknown as DesktopEvent));
  return { bridge, invoke, emit, listeners };
}

describe('IpcAssistantRepository', () => {
  it('envia a pergunta e repassa só os eventos da própria requisição', async () => {
    const { bridge, invoke, emit, listeners } = fakeBridge();
    const onToken = vi.fn();
    const onDone = vi.fn();

    const session = new IpcAssistantRepository(bridge).ask(
      { question: 'Como instalar?', scope: { courseId: 'c1' } },
      { onToken, onDone, onError: vi.fn() },
    );
    await vi.waitFor(() => expect(invoke).toHaveBeenCalled());

    emit('assistant:token', { requestId: 'outro', token: 'x' });
    emit('assistant:token', { requestId: 'r1', token: 'Olá' });
    emit('assistant:done', {
      requestId: 'r1',
      answer: { text: 'Olá', sources: [], citations: [] },
    });

    expect(invoke).toHaveBeenCalledWith('assistant.ask', {
      question: 'Como instalar?',
      scope: { courseId: 'c1' },
    });
    expect(onToken.mock.calls).toEqual([['Olá']]);
    expect(onDone).toHaveBeenCalledWith({ text: 'Olá', sources: [], citations: [] });
    expect(listeners.size).toBe(0);
    await session.cancel();
  });

  it('cancela a geração no núcleo', async () => {
    const { bridge, invoke } = fakeBridge();
    const session = new IpcAssistantRepository(bridge).ask(
      { question: 'Pergunta' },
      { onToken: vi.fn(), onDone: vi.fn(), onError: vi.fn() },
    );
    await vi.waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
    await session.cancel();
    expect(invoke).toHaveBeenLastCalledWith('assistant.cancel', { requestId: 'r1' });
  });
});
