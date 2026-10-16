import { useEffect, useState } from 'react';
import type { SystemInfo } from '@midoteca/core';
import { getMidotecaBridge } from '@/platform/desktop/midoteca-bridge';

export interface DesktopRuntimeState {
  /** True when running inside the Electron shell (bridge present). */
  isDesktop: boolean;
  /** Kernel/app data info, available once `system.info` resolves. */
  info: SystemInfo | null;
  /** Human-readable error if `system.info` failed. */
  error: string | null;
}

/**
 * Presentation hook exposing the desktop runtime status. It performs the IPC
 * read (`system.info`) itself so components stay free of bridge details.
 */
export function useDesktopRuntime(): DesktopRuntimeState {
  const bridge = getMidotecaBridge();
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bridge) return;
    let active = true;
    bridge.invoke('system.info').then(
      (value) => {
        if (active) setInfo(value);
      },
      (cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : String(cause));
      },
    );
    return () => {
      active = false;
    };
  }, [bridge]);

  return { isDesktop: bridge !== null, info, error };
}
