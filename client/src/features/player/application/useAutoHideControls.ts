import { useCallback, useEffect, useRef, useState } from 'react';

interface UseAutoHideControlsOptions {
  /** Se o player está reproduzindo no momento. */
  isPlaying: boolean;
  /** Enquanto verdadeiro, os controles permanecem visíveis (pausa, menus abertos, etc.). */
  keepVisible?: boolean;
  /** Tempo de inatividade antes de ocultar (ms). */
  autoHideDelayMs?: number;
}

interface UseAutoHideControlsResult {
  areControlsVisible: boolean;
  /** Exibe os controles e reinicia o temporizador de auto-ocultação. */
  showControls: () => void;
}

/**
 * Controla a visibilidade dos controles de um player: ficam visíveis ao
 * interagir (mover o mouse) e se ocultam após um período de inatividade
 * enquanto a mídia está reproduzindo.
 */
export function useAutoHideControls({
  isPlaying,
  keepVisible = false,
  autoHideDelayMs = 3000,
}: UseAutoHideControlsOptions): UseAutoHideControlsResult {
  const [areControlsVisible, setAreControlsVisible] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    clearTimer();
    if (!isPlaying || keepVisible) return;
    timeoutRef.current = setTimeout(() => {
      setAreControlsVisible(false);
      timeoutRef.current = null;
    }, autoHideDelayMs);
  }, [autoHideDelayMs, clearTimer, isPlaying, keepVisible]);

  const showControls = useCallback(() => {
    setAreControlsVisible(true);
    scheduleHide();
  }, [scheduleHide]);

  useEffect(() => {
    if (!isPlaying || keepVisible) {
      clearTimer();
      setAreControlsVisible(true);
      return;
    }
    scheduleHide();
    return clearTimer;
  }, [clearTimer, isPlaying, keepVisible, scheduleHide]);

  return { areControlsVisible, showControls };
}
