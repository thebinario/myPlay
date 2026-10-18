import type { MidotecaBridge } from '@/core/contracts/desktop-bridge';
import type { OnboardingRepository } from '@/core/contracts/onboarding';

const ONBOARDING_SETTING_KEY = 'onboarding_completed';

/**
 * Adapter concreto de estado de primeiro acesso (onboarding) persistido no SQLite via IPC.
 */
export class IpcOnboardingRepository implements OnboardingRepository {
  private completed: boolean;
  private hydrating: Promise<void> | null = null;

  constructor(
    private readonly bridge: MidotecaBridge,
    initialCompleted = false,
  ) {
    this.completed = initialCompleted;
  }

  /**
   * Carrega o estado de conclusão do onboarding do SQLite.
   */
  async hydrate(): Promise<void> {
    if (this.hydrating) return this.hydrating;
    this.hydrating = (async () => {
      try {
        const setting = await this.bridge.invoke('settings.get', { key: ONBOARDING_SETTING_KEY });
        if (setting && typeof setting.value === 'boolean') {
          this.completed = setting.value;
        }
      } catch (error) {
        console.error('[onboarding] falha ao carregar estado do SQLite', error);
      }
    })();

    try {
      await this.hydrating;
    } finally {
      this.hydrating = null;
    }
  }

  isCompleted(): boolean {
    return this.completed;
  }

  complete(): void {
    this.completed = true;
    void this.bridge
      .invoke('settings.set', {
        key: ONBOARDING_SETTING_KEY,
        value: true,
      })
      .catch((error: unknown) => {
        console.error('[onboarding] falha ao persistir conclusão no SQLite', error);
      });
  }

  reset(): void {
    this.completed = false;
    void this.bridge
      .invoke('settings.set', {
        key: ONBOARDING_SETTING_KEY,
        value: false,
      })
      .catch((error: unknown) => {
        console.error('[onboarding] falha ao persistir reset no SQLite', error);
      });
  }
}
