import type { MidotecaBridge } from '@/core/contracts/desktop-bridge';
import type { LocalAiRepository, LocalAiStatusView } from '@/modules/settings/domain/local-ai';

/** Adapter IPC do status e dos controles da IA local (`ai.*`). */
export class IpcLocalAiRepository implements LocalAiRepository {
  constructor(private readonly bridge: MidotecaBridge) {}

  status(): Promise<LocalAiStatusView> {
    return this.bridge.invoke('ai.status', {});
  }

  setEnabled(enabled: boolean): Promise<LocalAiStatusView> {
    return this.bridge.invoke('ai.setEnabled', { enabled });
  }

  removeModels(): Promise<LocalAiStatusView> {
    return this.bridge.invoke('ai.removeModels', {});
  }
}
