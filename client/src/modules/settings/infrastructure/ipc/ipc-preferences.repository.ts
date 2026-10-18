import type { MidotecaBridge } from '@/core/contracts/desktop-bridge';
import type { JsonValue } from '@midoteca/core';
import {
  DEFAULT_PREFERENCES,
  normalizePreferences,
  type AppPreferences,
} from '@/modules/settings/domain/preferences';
import type { PreferencesRepository } from '@/modules/settings/domain/repositories';

/**
 * Adapter concreto de preferências de usuário conectado ao SQLite do núcleo via IPC.
 * Mantém um snapshot síncrono em memória para a UI e persiste alterações assincronamente.
 */
export class IpcPreferencesRepository implements PreferencesRepository {
  private preferences: AppPreferences;
  private readonly listeners = new Set<() => void>();
  private hydrating: Promise<void> | null = null;

  constructor(
    private readonly bridge: MidotecaBridge,
    initialPreferences: Partial<AppPreferences> | null = null,
  ) {
    this.preferences = normalizePreferences(initialPreferences);
  }

  /**
   * Carrega as preferências salvas no SQLite do núcleo.
   */
  async hydrate(): Promise<void> {
    if (this.hydrating) return this.hydrating;
    this.hydrating = (async () => {
      try {
        const setting = await this.bridge.invoke('settings.get', { key: 'preferences' });
        if (setting && typeof setting.value === 'object' && setting.value !== null) {
          this.preferences = normalizePreferences(setting.value as Partial<AppPreferences>);
          this.emit();
        }
      } catch (error) {
        console.error('[settings] falha ao carregar preferências do SQLite', error);
      }
    })();

    try {
      await this.hydrating;
    } finally {
      this.hydrating = null;
    }
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }

  get(): AppPreferences {
    return this.preferences;
  }

  save(preferences: AppPreferences): void {
    this.preferences = { ...preferences };
    this.emit();
    void this.bridge
      .invoke('settings.set', {
        key: 'preferences',
        value: this.preferences as unknown as JsonValue,
      })
      .catch((error: unknown) => {
        console.error('[settings] falha ao persistir preferências no SQLite', error);
      });
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  reset(): void {
    this.save({ ...DEFAULT_PREFERENCES });
  }
}
