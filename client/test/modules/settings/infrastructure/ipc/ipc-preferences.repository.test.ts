import { describe, it, expect, vi } from 'vitest';
import type { MidotecaBridge } from '@/core/contracts/desktop-bridge';
import { DEFAULT_PREFERENCES } from '@/modules/settings/domain/preferences';
import { IpcPreferencesRepository } from '@/modules/settings/infrastructure/ipc/ipc-preferences.repository';

function createFakeSettingsBridge(initialStore: Record<string, unknown> = {}): {
  bridge: MidotecaBridge;
  store: Record<string, unknown>;
} {
  const store = { ...initialStore };
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

describe('IpcPreferencesRepository (SQLite via IPC)', () => {
  it('inicia com os padrões e carrega dados salvos no SQLite via hydrate', async () => {
    const { bridge } = createFakeSettingsBridge({
      preferences: {
        theme: 'light',
        playbackSpeed: '1.25',
      },
    });

    const repo = new IpcPreferencesRepository(bridge);
    expect(repo.get().theme).toBe('dark'); // Padrão antes do hydrate

    await repo.hydrate();

    expect(repo.get().theme).toBe('light');
    expect(repo.get().playbackSpeed).toBe('1.25');
    expect(repo.get().interfaceLanguage).toBe(DEFAULT_PREFERENCES.interfaceLanguage);
    expect(bridge.invoke).toHaveBeenCalledWith('settings.get', { key: 'preferences' });
  });

  it('salva preferências no SQLite e notifica ouvintes', async () => {
    const { bridge, store } = createFakeSettingsBridge();
    const repo = new IpcPreferencesRepository(bridge);
    const listener = vi.fn();
    repo.subscribe(listener);

    const updated = {
      ...repo.get(),
      theme: 'light' as const,
      playbackSpeed: '1.5',
    };

    repo.save(updated);

    expect(repo.get().theme).toBe('light');
    expect(repo.get().playbackSpeed).toBe('1.5');
    expect(listener).toHaveBeenCalledTimes(1);

    // Verifica chamada ao bridge
    expect(bridge.invoke).toHaveBeenCalledWith('settings.set', {
      key: 'preferences',
      value: updated,
    });
    expect(store.preferences).toEqual(updated);
  });

  it('permite redefinir para os padrões com reset', async () => {
    const { bridge } = createFakeSettingsBridge({
      preferences: { theme: 'light', playbackSpeed: '2' },
    });
    const repo = new IpcPreferencesRepository(bridge);
    await repo.hydrate();

    repo.reset();

    expect(repo.get().theme).toBe('dark');
    expect(repo.get().playbackSpeed).toBe('1');
    expect(bridge.invoke).toHaveBeenCalledWith('settings.set', {
      key: 'preferences',
      value: DEFAULT_PREFERENCES,
    });
  });
});
