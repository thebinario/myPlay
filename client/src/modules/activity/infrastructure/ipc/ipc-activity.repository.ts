import type { ActivitySnapshot } from '@midoteca/core';
import type { MidotecaBridge } from '@/core/contracts/desktop-bridge';
import {
  IDLE_ACTIVITY,
  type ActivityRepository,
  type ActivitySnapshotView,
} from '@/modules/activity/domain/activity';

function toView(snapshot: ActivitySnapshot): ActivitySnapshotView {
  return {
    running: snapshot.running,
    queued: snapshot.queued,
    items: snapshot.items.map((item) => ({
      id: item.id,
      kind: item.kind,
      status: item.status,
      label: item.label,
      percent: item.percent,
      detail: item.detail,
    })),
  };
}

/**
 * Adapter IPC da atividade: lê `activity.list` uma vez e passa a seguir os
 * retratos empurrados pelo núcleo em `activity:changed`.
 */
export class IpcActivityRepository implements ActivityRepository {
  private snapshot: ActivitySnapshotView = IDLE_ACTIVITY;
  private readonly listeners = new Set<() => void>();
  private readonly detach: () => void;
  private receivedEvent = false;

  constructor(private readonly bridge: MidotecaBridge) {
    this.detach = bridge.onEvent((event) => {
      if (event.name !== 'activity:changed' || !event.payload) return;
      this.receivedEvent = true;
      this.publish(toView(event.payload as unknown as ActivitySnapshot));
    });
  }

  async hydrate(): Promise<void> {
    const snapshot = await this.bridge.invoke('activity.list');
    // Um evento que chegou durante a leitura é mais recente que ela.
    if (!this.receivedEvent) this.publish(toView(snapshot));
  }

  getSnapshot(): ActivitySnapshotView {
    return this.snapshot;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  dispose(): void {
    this.detach();
    this.listeners.clear();
  }

  private publish(snapshot: ActivitySnapshotView): void {
    this.snapshot = snapshot;
    for (const listener of this.listeners) listener();
  }
}
