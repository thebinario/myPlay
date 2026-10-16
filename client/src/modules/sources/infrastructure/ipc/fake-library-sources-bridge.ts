import type { MidotecaBridge } from '@/core/contracts/desktop-bridge';
import type { LibrarySource } from '@/core/domain/library-source';

export interface FakeSource {
  id: string;
  rootPath: string;
  displayName: string | null;
  status: 'active' | 'offline' | 'scanning' | 'error';
  lastScanAt: string | null;
}

type Handler = (params: unknown) => unknown;

export function createFakeBridge(handlers: Record<string, Handler>): MidotecaBridge {
  const invoke = (async (method: string, params?: unknown) => {
    const handler = handlers[method];
    if (!handler) throw new Error(`método inesperado: ${method}`);
    return handler(params);
  }) as MidotecaBridge['invoke'];
  return { invoke, onEvent: () => () => {}, pickDirectory: async () => null };
}

export async function eventually(assertion: () => void, timeoutMs = 1000): Promise<void> {
  const start = Date.now();
  let lastError: unknown;
  while (Date.now() - start < timeoutMs) {
    try {
      assertion();
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
  throw lastError;
}

export function localSource(overrides: Partial<LibrarySource> = {}): LibrarySource {
  return {
    id: 'local-1',
    path: '/Volumes/HD',
    name: 'HD',
    status: 'connected',
    itemCount: 0,
    lastScannedAt: null,
    ...overrides,
  };
}
