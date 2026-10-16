import type { DesktopEvent, DesktopMethod, DesktopParams, DesktopResults } from '@midoteca/core';

/**
 * Frontend-facing contract of the desktop bridge.
 *
 * The types come from `@midoteca/core` (the single source of truth of the RPC
 * protocol) as **type-only imports**, so nothing from the core is bundled into
 * the renderer. The concrete implementation is injected by Electron's preload
 * (`window.midoteca`); tests use an in-process fake.
 */
export interface MidotecaBridge {
  invoke<M extends DesktopMethod>(method: M, params?: DesktopParams[M]): Promise<DesktopResults[M]>;
  /** Subscribes to core events (index progress, source changes). */
  onEvent(listener: (event: DesktopEvent) => void): () => void;
  /** Opens the OS directory picker; resolves to the absolute path or null. */
  pickDirectory(): Promise<string | null>;
}

export type { DesktopEvent, DesktopMethod } from '@midoteca/core';
