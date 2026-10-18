import { describe, it, expect, vi } from 'vitest';
import type { MidotecaBridge } from '@/core/contracts/desktop-bridge';
import { IpcOnboardingRepository } from '@/modules/onboarding/infrastructure/ipc/ipc-onboarding.repository';

function createFakeOnboardingBridge(initialCompleted = false): {
  bridge: MidotecaBridge;
  store: Record<string, unknown>;
} {
  const store: Record<string, unknown> = {
    onboarding_completed: initialCompleted,
  };
  const bridge: MidotecaBridge = {
    invoke: vi.fn(async (method: string, params?: any) => {
      if (method === 'settings.get') {
        const value = store[params.key];
        return value !== undefined
          ? { key: params.key, value, updatedAt: new Date().toISOString() }
          : null;
      }
      if (method === 'settings.set') {
        store[params.key] = params.value;
        return { key: params.key, value: params.value, updatedAt: new Date().toISOString() };
      }
      throw new Error(`Método não suportado: ${method}`);
    }) as MidotecaBridge['invoke'],
    onEvent: () => () => {},
    pickDirectory: async () => null,
  };
  return { bridge, store };
}

describe('IpcOnboardingRepository (SQLite via IPC)', () => {
  it('carrega o estado do onboarding do SQLite via hydrate', async () => {
    const { bridge } = createFakeOnboardingBridge(true);
    const repo = new IpcOnboardingRepository(bridge);
    expect(repo.isCompleted()).toBe(false);

    await repo.hydrate();

    expect(repo.isCompleted()).toBe(true);
    expect(bridge.invoke).toHaveBeenCalledWith('settings.get', { key: 'onboarding_completed' });
  });

  it('marca o onboarding como concluído no SQLite', () => {
    const { bridge, store } = createFakeOnboardingBridge(false);
    const repo = new IpcOnboardingRepository(bridge);

    repo.complete();

    expect(repo.isCompleted()).toBe(true);
    expect(bridge.invoke).toHaveBeenCalledWith('settings.set', {
      key: 'onboarding_completed',
      value: true,
    });
    expect(store.onboarding_completed).toBe(true);
  });

  it('permite resetar o onboarding no SQLite', () => {
    const { bridge, store } = createFakeOnboardingBridge(true);
    const repo = new IpcOnboardingRepository(bridge);

    repo.reset();

    expect(repo.isCompleted()).toBe(false);
    expect(bridge.invoke).toHaveBeenCalledWith('settings.set', {
      key: 'onboarding_completed',
      value: false,
    });
    expect(store.onboarding_completed).toBe(false);
  });
});
