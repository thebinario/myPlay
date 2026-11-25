import { useEffect, useState } from 'react';

/**
 * Faz o cronômetro "andar" entre leituras do núcleo. O valor de referência é o
 * `elapsedMs` entregue pelo backend; aqui só soma o tempo de tela desde então.
 */
export function useLiveElapsed(elapsedMs: number | null): number | null {
  const [tick, setTick] = useState<{ base: number | null; offset: number }>({
    base: elapsedMs,
    offset: 0,
  });

  useEffect(() => {
    if (elapsedMs === null) return;
    const receivedAt = Date.now();
    const id = window.setInterval(
      () => setTick({ base: elapsedMs, offset: Date.now() - receivedAt }),
      1000,
    );
    return () => window.clearInterval(id);
  }, [elapsedMs]);

  if (elapsedMs === null) return null;
  return tick.base === elapsedMs ? elapsedMs + tick.offset : elapsedMs;
}
