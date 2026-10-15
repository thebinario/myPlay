export interface ResourceSignals {
  /** Media playback is active; indexing should back off. */
  playbackActive: boolean;
  /** The target disk is busy; indexing should back off. */
  diskBusy: boolean;
  /** System memory pressure is high; indexing should back off. */
  memoryPressure: boolean;
  /** Running on battery; favor lower IO. */
  onBattery: boolean;
}

const DEFAULT_SIGNALS: ResourceSignals = {
  playbackActive: false,
  diskBusy: false,
  memoryPressure: false,
  onBattery: false,
};

/**
 * Cooperative back-pressure controller. The indexer never blocks the UI thread
 * on its own; callers (the desktop layer) push signals in, and the indexer
 * awaits `waitWhilePaused()` / `throttle()` between batches.
 */
export class ResourceGovernor {
  private signals: ResourceSignals = { ...DEFAULT_SIGNALS };
  private paused = false;
  private cancelled = false;
  private resumeWaiters: Array<() => void> = [];

  constructor(private readonly options: { throttleMs?: number } = {}) {}

  updateSignals(partial: Partial<ResourceSignals>): void {
    this.signals = { ...this.signals, ...partial };
  }

  getSignals(): ResourceSignals {
    return { ...this.signals };
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
    const waiters = this.resumeWaiters;
    this.resumeWaiters = [];
    for (const resolve of waiters) resolve();
  }

  cancel(): void {
    this.cancelled = true;
    this.resume();
  }

  reset(): void {
    this.cancelled = false;
    this.paused = false;
    this.resumeWaiters = [];
  }

  get isPaused(): boolean {
    return this.paused;
  }

  get isCancelled(): boolean {
    return this.cancelled;
  }

  get isThrottled(): boolean {
    return (
      this.signals.playbackActive ||
      this.signals.diskBusy ||
      this.signals.memoryPressure ||
      this.signals.onBattery
    );
  }

  /** Resolves once indexing is allowed to continue (or was cancelled). */
  waitWhilePaused(): Promise<void> {
    if (!this.paused || this.cancelled) return Promise.resolve();
    return new Promise((resolve) => {
      this.resumeWaiters.push(resolve);
    });
  }

  /** Yields briefly when a resource signal asks for a slower pace. */
  async throttle(): Promise<void> {
    if (!this.isThrottled) return;
    const base = this.options.throttleMs ?? 25;
    const factor =
      (this.signals.playbackActive ? 4 : 1) +
      (this.signals.memoryPressure ? 2 : 0) +
      (this.signals.onBattery ? 1 : 0);
    await new Promise((resolve) => setTimeout(resolve, base * factor));
  }
}
