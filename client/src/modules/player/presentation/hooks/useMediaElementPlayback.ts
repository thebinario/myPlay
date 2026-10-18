import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { clampSeekTime } from '@/modules/player/domain/progress';
import {
  classifyPlaybackError,
  type PlaybackErrorInfo,
} from '@/modules/player/domain/playback-error';

export type PlayerStatus =
  'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'buffering' | 'seeking' | 'ended' | 'error';

/**
 * Controla a reprodução de um elemento `<video>` real, expondo um estado
 * unificado (status, isPlaying, currentTime, ...) consumido pelos players.
 *
 * O estado é atualizado de forma otimista nas chamadas imperativas e
 * sincronizado com os eventos nativos do elemento de mídia. Em ambientes sem
 * suporte a mídia (ex.: jsdom nos testes), o estado otimista garante que a UI
 * permaneça funcional.
 */
export interface MediaElementPlayback {
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
  errorInfo: PlaybackErrorInfo | null;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  replay: () => void;
  retry: () => void;
  seek: (time: number) => void;
  skip: (deltaSeconds: number) => void;
  setPlaybackRate: (rate: number) => void;
}

export interface UseMediaElementPlaybackOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  /** Fonte atual da mídia (reinicia o estado quando muda). */
  src: string;
  /** Duração usada antes do metadado carregar. */
  fallbackDuration?: number;
  initialTime?: number;
  autoPlay?: boolean;
  /** Quando verdadeiro, entra em estado de erro (arquivo indisponível). */
  unavailable?: boolean;
  onEnded?: () => void;
  onProgress?: (snapshot: { currentTime: number; isPlaying: boolean }) => void;
}

function applyRate(video: HTMLVideoElement | null, rate: number) {
  if (!video || !SUPPORTS_MEDIA_PLAYBACK) return;
  try {
    video.playbackRate = rate;
  } catch {
    /* ignore */
  }
}

/** jsdom não implementa a reprodução de mídia; sinaliza para não disparar erros. */
const SUPPORTS_MEDIA_PLAYBACK =
  typeof navigator === 'undefined' || !/jsdom/i.test(navigator.userAgent);

function startPlayback(video: HTMLVideoElement | null): void {
  if (!video || !SUPPORTS_MEDIA_PLAYBACK) return;
  try {
    const p = video.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  } catch {
    /* ignore */
  }
}

function stopPlayback(video: HTMLVideoElement | null): void {
  if (!video || !SUPPORTS_MEDIA_PLAYBACK) return;
  try {
    video.pause();
  } catch {
    /* ignore */
  }
}

function reloadVideo(video: HTMLVideoElement | null): void {
  if (!video || !SUPPORTS_MEDIA_PLAYBACK) return;
  try {
    video.load();
  } catch {
    /* ignore */
  }
}

export function useMediaElementPlayback({
  videoRef,
  src,
  fallbackDuration = 0,
  initialTime = 0,
  autoPlay = false,
  unavailable = false,
  onEnded,
  onProgress,
}: UseMediaElementPlaybackOptions): MediaElementPlayback {
  const [status, setStatus] = useState<PlayerStatus>(unavailable ? 'error' : 'ready');
  const [errorInfo, setErrorInfo] = useState<PlaybackErrorInfo | null>(() =>
    unavailable ? classifyPlaybackError({ isUnavailable: true, url: src }) : null,
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [mediaDuration, setMediaDuration] = useState(fallbackDuration);
  const [playbackRate, setPlaybackRateState] = useState(1);

  const isPlayingRef = useRef(isPlaying);
  const currentTimeRef = useRef(currentTime);
  const statusRef = useRef(status);
  const durationRef = useRef(mediaDuration);
  const onEndedRef = useRef(onEnded);
  const initialTimeRef = useRef(initialTime);
  const autoPlayRef = useRef(autoPlay);
  const resumeStatusRef = useRef<PlayerStatus>('ready');

  isPlayingRef.current = isPlaying;
  currentTimeRef.current = currentTime;
  statusRef.current = status;
  durationRef.current = mediaDuration;
  onEndedRef.current = onEnded;
  initialTimeRef.current = initialTime;
  autoPlayRef.current = autoPlay;

  const duration =
    Number.isFinite(mediaDuration) && mediaDuration > 0
      ? mediaDuration
      : Number.isFinite(fallbackDuration)
        ? fallbackDuration
        : 0;

  // Reinicia o estado quando a mídia (src) ou a disponibilidade mudam.
  useEffect(() => {
    const video = videoRef.current;
    setIsPlaying(false);
    setCurrentTime(initialTimeRef.current);
    setMediaDuration(fallbackDuration);
    setPlaybackRateState(1);
    applyRate(video, 1);

    if (unavailable) {
      setErrorInfo(classifyPlaybackError({ isUnavailable: true, url: src }));
      setStatus('error');
      return;
    }

    setErrorInfo(null);

    if (fallbackDuration > 0 && initialTimeRef.current >= fallbackDuration) {
      setStatus('ended');
      return;
    }

    setStatus('ready');
    reloadVideo(video);
    if (autoPlayRef.current) {
      setIsPlaying(true);
      setStatus('playing');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, unavailable, fallbackDuration]);

  // Vincula os eventos nativos do elemento de mídia.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const seekToInitial = () => {
      const t = initialTimeRef.current;
      if (t > 0) {
        try {
          video.currentTime = t;
        } catch {
          /* ignore */
        }
      }
    };
    const maybeAutoPlay = () => {
      if (autoPlayRef.current && video.paused) {
        if (SUPPORTS_MEDIA_PLAYBACK) {
          try {
            const p = video.play();
            if (p && typeof p.catch === 'function') {
              p.catch(() => {
                setIsPlaying(false);
                setStatus((prev) => (prev === 'ended' ? prev : 'paused'));
              });
            }
          } catch {
            /* ignore */
          }
        }
      }
    };

    const onLoadedMetadata = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) setMediaDuration(video.duration);
      seekToInitial();
      maybeAutoPlay();
      setStatus((prev) => (prev === 'loading' ? 'ready' : prev));
    };
    const onLoadStart = () => {
      if (video.readyState < 1) setStatus('loading');
    };
    const onCanPlay = () => {
      setStatus((prev) => {
        if (prev === 'loading' || prev === 'buffering' || prev === 'seeking') {
          return isPlayingRef.current
            ? 'playing'
            : resumeStatusRef.current === 'playing'
              ? 'ready'
              : resumeStatusRef.current;
        }
        return prev;
      });
    };
    const onTimeUpdate = () => {
      currentTimeRef.current = video.currentTime;
      setCurrentTime(video.currentTime);
    };
    const onPlaying = () => {
      setIsPlaying(true);
      setStatus('playing');
    };
    const onPlay = () => {
      setIsPlaying(true);
      setStatus('playing');
    };
    const onPause = () => {
      if (video.ended) return;
      setIsPlaying(false);
      setStatus((prev) => (prev === 'error' || prev === 'ended' ? prev : 'paused'));
    };
    const onWaiting = () => setStatus('buffering');
    const onSeeking = () => setStatus('seeking');
    const onSeeked = () => setStatus(resumeStatusRef.current);
    const onEnded = () => {
      setIsPlaying(false);
      setStatus('ended');
      onEndedRef.current?.();
    };
    const onError = () => {
      const mediaError = video.error;
      const initialInfo = classifyPlaybackError({
        url: src,
        mediaErrorCode: mediaError?.code,
        mediaErrorMessage: mediaError?.message,
      });
      setErrorInfo(initialInfo);
      setStatus('error');

      // Se aplicável, verifica no backend/protocolo se o arquivo realmente existe
      if (typeof fetch === 'function' && src && !src.startsWith('blob:') && !src.startsWith('data:')) {
        fetch(src, { method: 'HEAD' })
          .then((res) => {
            if (res.status === 404 || res.status === 403) {
              setErrorInfo(classifyPlaybackError({ url: src, httpStatus: res.status }));
            } else if (res.ok) {
              setErrorInfo(
                classifyPlaybackError({
                  url: src,
                  mediaErrorCode: mediaError?.code ?? 4,
                  mediaErrorMessage: mediaError?.message,
                  httpStatus: res.status,
                }),
              );
            }
          })
          .catch(() => {
            /* ignore network/fetch error */
          });
      }
    };
    const onRateChange = () => setPlaybackRateState(video.playbackRate);
    const onDurationChange = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) setMediaDuration(video.duration);
    };

    video.addEventListener('loadstart', onLoadStart);
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('play', onPlay);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('pause', onPause);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('seeking', onSeeking);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('ended', onEnded);
    video.addEventListener('error', onError);
    video.addEventListener('ratechange', onRateChange);

    return () => {
      video.removeEventListener('loadstart', onLoadStart);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('seeking', onSeeking);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('error', onError);
      video.removeEventListener('ratechange', onRateChange);
    };
  }, [videoRef, src]);

  // Propaga o estado para consumidores externos (ex.: mini player / App).
  useEffect(() => {
    onProgress?.({ currentTime, isPlaying });
  }, [currentTime, isPlaying, onProgress]);

  const play = useCallback(() => {
    if (statusRef.current === 'error') return;
    const video = videoRef.current;
    setIsPlaying(true);
    setStatus('playing');
    resumeStatusRef.current = 'playing';
    startPlayback(video);
  }, [videoRef]);

  const pause = useCallback(() => {
    const video = videoRef.current;
    setIsPlaying(false);
    setStatus((prev) => (prev === 'error' || prev === 'ended' ? prev : 'paused'));
    stopPlayback(video);
  }, [videoRef]);

  const toggle = useCallback(() => {
    if (isPlayingRef.current) pause();
    else play();
  }, [pause, play]);

  const replay = useCallback(() => {
    const video = videoRef.current;
    setCurrentTime(0);
    if (video) {
      try {
        video.currentTime = 0;
      } catch {
        /* ignore */
      }
    }
    play();
  }, [play, videoRef]);

  const retry = useCallback(() => {
    const video = videoRef.current;
    setErrorInfo(null);
    initialTimeRef.current = currentTimeRef.current;
    setIsPlaying(false);
    setStatus('loading');
    reloadVideo(video);
  }, [videoRef]);

  const seek = useCallback(
    (time: number) => {
      if (statusRef.current === 'error') return;
      const dur = durationRef.current || 0;
      const clamped = clampSeekTime(time, dur);
      currentTimeRef.current = clamped;
      setCurrentTime(clamped);

      const video = videoRef.current;
      if (video) {
        try {
          video.currentTime = clamped;
        } catch {
          /* ignore */
        }
      }

      if (dur > 0 && clamped >= dur) {
        setIsPlaying(false);
        setStatus('ended');
        return;
      }

      resumeStatusRef.current = isPlayingRef.current ? 'playing' : 'paused';
      setStatus('seeking');
      // Fallback caso o evento nativo 'seeked' não seja emitido.
      window.setTimeout(() => {
        if (statusRef.current === 'seeking') setStatus(resumeStatusRef.current);
      }, 400);
    },
    [videoRef],
  );

  const skip = useCallback(
    (delta: number) => {
      const video = videoRef.current;
      const mediaTime =
        video && video.readyState >= 1 && Number.isFinite(video.currentTime)
          ? video.currentTime
          : currentTimeRef.current;
      seek(mediaTime + delta);
    },
    [seek, videoRef],
  );

  const setPlaybackRate = useCallback(
    (rate: number) => {
      setPlaybackRateState(rate);
      applyRate(videoRef.current, rate);
    },
    [videoRef],
  );

  const isLoading = status === 'loading' || status === 'idle';
  const isBuffering = status === 'buffering';
  const isSeeking = status === 'seeking';
  const hasEnded = status === 'ended';
  const hasError = status === 'error';

  return useMemo(
    () => ({
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
      errorInfo,
      play,
      pause,
      toggle,
      replay,
      retry,
      seek,
      skip,
      setPlaybackRate,
    }),
    [
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
      errorInfo,
      play,
      pause,
      toggle,
      replay,
      retry,
      seek,
      skip,
      setPlaybackRate,
    ],
  );
}
