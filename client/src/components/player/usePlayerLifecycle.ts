import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Ciclo de vida de um reprodutor de vídeo.
 *
 *  idle ──▶ loading ──▶ ready ──▶ playing ⇄ paused
 *                        ▲           │  ▲
 *                        │           ▼  │
 *                     seeking ◀──── buffering
 *                        │
 *                        ▼
 *                     ended / error
 */
export type PlayerStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'buffering'
  | 'seeking'
  | 'ended'
  | 'error';

export interface PlayerLifecycleOptions {
  /** Identifica a mídia atual (aula/filme). Ao mudar, o player reinicia o ciclo. */
  mediaKey: string;
  /** Duração total em segundos. */
  duration: number;
  /** Posição inicial (retomada) em segundos. */
  initialTime?: number;
  /** Velocidade inicial. */
  initialRate?: number;
  /** Quando verdadeiro, o player entra em estado de erro (arquivo indisponível). */
  unavailable?: boolean;
  /** Latência simulada de carregamento inicial (ms). */
  loadingDelayMs?: number;
  /** Latência simulada de buffer ao iniciar/retomar (ms). */
  bufferingDelayMs?: number;
  /** Latência simulada de busca na linha do tempo (ms). */
  seekDelayMs?: number;
  /** Disparado quando a mídia chega ao fim. */
  onEnded?: () => void;
}

export interface PlayerLifecycle {
  status: PlayerStatus;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  isLoading: boolean;
  isBuffering: boolean;
  isSeeking: boolean;
  hasEnded: boolean;
  hasError: boolean;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  replay: () => void;
  seek: (time: number) => void;
  skip: (deltaSeconds: number) => void;
  setPlaybackRate: (rate: number) => void;
}

export function usePlayerLifecycle(options: PlayerLifecycleOptions): PlayerLifecycle {
  const {
    mediaKey,
    duration,
    initialTime = 0,
    initialRate = 1,
    unavailable = false,
    loadingDelayMs = 450,
    bufferingDelayMs = 350,
    seekDelayMs = 280,
    onEnded,
  } = options;

  const [status, setStatus] = useState<PlayerStatus>('loading');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [playbackRate, setPlaybackRateState] = useState(initialRate);

  const isPlayingRef = useRef(isPlaying);
  const statusRef = useRef(status);
  const currentTimeRef = useRef(currentTime);
  const initialTimeRef = useRef(initialTime);
  const onEndedRef = useRef(onEnded);

  const loadTimer = useRef<number | null>(null);
  const bufferTimer = useRef<number | null>(null);
  const seekTimer = useRef<number | null>(null);

  isPlayingRef.current = isPlaying;
  statusRef.current = status;
  currentTimeRef.current = currentTime;
  initialTimeRef.current = initialTime;
  onEndedRef.current = onEnded;

  const clearTimers = useCallback(() => {
    if (loadTimer.current) { window.clearTimeout(loadTimer.current); loadTimer.current = null; }
    if (bufferTimer.current) { window.clearTimeout(bufferTimer.current); bufferTimer.current = null; }
    if (seekTimer.current) { window.clearTimeout(seekTimer.current); seekTimer.current = null; }
  }, []);

  // ── Reinicia o ciclo quando a mídia muda ────────────────────────────────────
  useEffect(() => {
    clearTimers();
    setIsPlaying(false);
    setCurrentTime(initialTimeRef.current);
    setPlaybackRateState(initialRate);

    if (unavailable) {
      setStatus('error');
      return clearTimers;
    }

    if (duration > 0 && initialTimeRef.current >= duration) {
      setStatus('ended');
      return clearTimers;
    }

    setStatus('loading');
    loadTimer.current = window.setTimeout(() => {
      setStatus(isPlayingRef.current ? 'playing' : 'ready');
    }, loadingDelayMs);

    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaKey, duration, unavailable, initialRate, loadingDelayMs]);

  // ── Motor de tempo (apenas em reprodução) ───────────────────────────────────
  useEffect(() => {
    if (status !== 'playing') return;

    const id = window.setInterval(() => {
      setCurrentTime(prev => {
        const next = prev + 1;
        if (next >= duration) {
          setIsPlaying(false);
          setStatus('ended');
          onEndedRef.current?.();
          return duration;
        }
        return next;
      });
    }, 1000 / playbackRate);

    return () => window.clearInterval(id);
  }, [status, duration, playbackRate]);

  const startBuffering = useCallback((resumeStatus: PlayerStatus) => {
    if (bufferTimer.current) window.clearTimeout(bufferTimer.current);
    setStatus('buffering');
    bufferTimer.current = window.setTimeout(() => setStatus(resumeStatus), bufferingDelayMs);
  }, [bufferingDelayMs]);

  const play = useCallback(() => {
    if (statusRef.current === 'error') return;
    if (loadTimer.current) { window.clearTimeout(loadTimer.current); loadTimer.current = null; }
    setIsPlaying(true);
    startBuffering('playing');
  }, [startBuffering]);

  const pause = useCallback(() => {
    if (bufferTimer.current) { window.clearTimeout(bufferTimer.current); bufferTimer.current = null; }
    if (seekTimer.current) { window.clearTimeout(seekTimer.current); seekTimer.current = null; }
    setIsPlaying(false);
    setStatus(prev => (prev === 'error' || prev === 'ended' ? prev : 'paused'));
  }, []);

  const toggle = useCallback(() => {
    if (isPlayingRef.current || statusRef.current === 'buffering') pause();
    else play();
  }, [pause, play]);

  const replay = useCallback(() => {
    if (statusRef.current === 'error') return;
    setCurrentTime(0);
    setIsPlaying(true);
    startBuffering('playing');
  }, [startBuffering]);

  const seek = useCallback((time: number) => {
    if (statusRef.current === 'error') return;

    const clamped = Math.max(0, Math.min(time, duration));
    setCurrentTime(clamped);

    if (duration <= 0) return;

    if (clamped >= duration) {
      if (bufferTimer.current) { window.clearTimeout(bufferTimer.current); bufferTimer.current = null; }
      if (seekTimer.current) { window.clearTimeout(seekTimer.current); seekTimer.current = null; }
      setIsPlaying(false);
      setStatus('ended');
      return;
    }

    const resumeTo: PlayerStatus = isPlayingRef.current
      ? 'playing'
      : statusRef.current === 'ready' || statusRef.current === 'seeking'
        ? 'ready'
        : 'paused';

    if (bufferTimer.current) { window.clearTimeout(bufferTimer.current); bufferTimer.current = null; }
    if (seekTimer.current) window.clearTimeout(seekTimer.current);
    setStatus('seeking');
    seekTimer.current = window.setTimeout(() => setStatus(resumeTo), seekDelayMs);
  }, [duration, seekDelayMs]);

  const skip = useCallback((delta: number) => {
    seek(currentTimeRef.current + delta);
  }, [seek]);

  const setPlaybackRate = useCallback((rate: number) => {
    setPlaybackRateState(rate);
  }, []);

  const isLoading = status === 'loading' || status === 'idle';
  const isBuffering = status === 'buffering';
  const isSeeking = status === 'seeking';
  const hasEnded = status === 'ended';
  const hasError = status === 'error';

  return useMemo(() => ({
    status,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    isLoading,
    isBuffering,
    isSeeking,
    hasEnded,
    hasError,
    play,
    pause,
    toggle,
    replay,
    seek,
    skip,
    setPlaybackRate,
  }), [
    status,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    isLoading,
    isBuffering,
    isSeeking,
    hasEnded,
    hasError,
    play,
    pause,
    toggle,
    replay,
    seek,
    skip,
    setPlaybackRate,
  ]);
}
