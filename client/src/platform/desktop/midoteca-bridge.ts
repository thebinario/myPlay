import type { MidotecaBridge } from '@/core/contracts/desktop-bridge';

declare global {
  interface Window {
    /** Injected by Electron's preload script. Absent in the browser/dev-server. */
    midoteca?: MidotecaBridge;
  }
}

/** Raised when a desktop-only capability is used outside the Electron runtime. */
export class MidotecaUnavailableError extends Error {
  constructor() {
    super('O runtime desktop (Electron) não está disponível nesta sessão.');
    this.name = 'MidotecaUnavailableError';
  }
}

/** Returns the bridge when running inside Electron, or null otherwise. */
export function getMidotecaBridge(): MidotecaBridge | null {
  if (typeof window === 'undefined') return null;
  return window.midoteca ?? null;
}

export function isDesktopRuntime(): boolean {
  return getMidotecaBridge() !== null;
}

export function requireMidotecaBridge(): MidotecaBridge {
  const bridge = getMidotecaBridge();
  if (!bridge) throw new MidotecaUnavailableError();
  return bridge;
}
