import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Course, Lesson, SubtitleTrack } from '@/core/domain/library';
import { useLibraryRepository } from '@/modules/library/presentation/LibraryProvider';
import { useMediaElementPlayback } from '@/modules/player/presentation/hooks/useMediaElementPlayback';
import { useAutoHideControls } from '@/modules/player/presentation/hooks/useAutoHideControls';
import { formatSeconds } from '@/modules/player/domain/progress';
import {
  lessonsOf,
  loadingLabelFor,
  nextLessonIndex,
  previousLessonIndex,
} from '@/modules/player/domain/playlist';

const DEFAULT_SUBTITLES: SubtitleTrack[] = [
  {
    id: 'sub-pt',
    label: 'Português (Brasil)',
    language: 'pt-BR',
    content: 'Reprodução simulada da MIDOTECA.',
  },
  { id: 'sub-en', label: 'English', language: 'en', content: 'MIDOTECA simulated playback.' },
];

export interface VideoPlayerOptions {
  course: Course;
  initialLessonId: string;
  controlsAutoHideDelayMs?: number;
  resumeTime?: number;
  autoPlay?: boolean;
  onCompleteLesson?: (lessonId: string) => void;
  onProgress?: (snapshot: { currentTime: number; isPlaying: boolean }) => void;
}

export interface VideoPlayerState {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  course: Course;
  currentLesson: Lesson;
  currentLessonIndex: number;
  totalLessons: number;
  isLastLesson: boolean;
  status: ReturnType<typeof useMediaElementPlayback>['status'];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  isLoading: boolean;
  isBuffering: boolean;
  isSeeking: boolean;
  hasEnded: boolean;
  hasError: boolean;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
  showSpeedMenu: boolean;
  showSubtitleMenu: boolean;
  selectedSubtitleId: string | null;
  availableSubtitles: SubtitleTrack[];
  activeSubtitle: SubtitleTrack | undefined;
  areControlsVisible: boolean;
  controlsVisibilityStyle: React.CSSProperties;
  loadingLabel: string;
  play: () => void;
  replay: () => void;
  seek: (time: number) => void;
  skip: (delta: number) => void;
  setPlaybackRate: (rate: number) => void;
  toggleFullscreen: () => void;
  setVolume: (volume: number) => void;
  setIsMuted: React.Dispatch<React.SetStateAction<boolean>>;
  setShowSpeedMenu: React.Dispatch<React.SetStateAction<boolean>>;
  setShowSubtitleMenu: React.Dispatch<React.SetStateAction<boolean>>;
  showControls: () => void;
  handleForward10: () => void;
  handleRewind10: () => void;
  handleTimelineSeek: (time: number) => void;
  handleNextLesson: () => void;
  handlePrevLesson: () => void;
  handleSelectSubtitle: (subtitleId: string | null) => void;
  handleSimulateImportSubtitle: () => void;
  handleReconnect: () => void;
  formatSeconds: (seconds: number) => string;
}

/**
 * Hook de apresentação que orquestra a reprodução de aulas: seleção de aula,
 * elemento <video>, legendas, volume, tela cheia e menus. As regras de tempo e
 * navegação de aulas ficam no domínio do módulo player.
 */
export function useVideoPlayer({
  course,
  initialLessonId,
  controlsAutoHideDelayMs,
  resumeTime,
  autoPlay,
  onCompleteLesson,
  onProgress,
}: VideoPlayerOptions): VideoPlayerState {
  const repository = useLibraryRepository();

  const allLessons = useMemo(() => lessonsOf(course), [course]);

  const [currentLessonId, setCurrentLessonId] = useState<string>(initialLessonId);
  const currentLessonIndex = allLessons.findIndex((l) => l.id === currentLessonId);
  const currentLesson = allLessons[currentLessonIndex] || allLessons[0];
  const isLastLesson = currentLessonIndex === allLessons.length - 1;

  const initialTime = useMemo(() => {
    if (resumeTime !== undefined && currentLesson.id === initialLessonId) return resumeTime;
    const saved = repository.getPlaybackPosition(course.id, currentLesson.id);
    return saved || currentLesson.lastPlaybackPosition || 0;
  }, [
    repository,
    course.id,
    currentLesson.id,
    currentLesson.lastPlaybackPosition,
    resumeTime,
    initialLessonId,
  ]);

  const [reconnected, setReconnected] = useState(false);
  useEffect(() => {
    setReconnected(false);
  }, [currentLessonId]);
  const isUnavailable = !!currentLesson.isUnavailable && !reconnected;

  const videoRef = useRef<HTMLVideoElement>(null);
  const fallbackDuration = currentLesson.duration || 0;
  const playback = useMediaElementPlayback({
    videoRef,
    src: currentLesson.videoUrl,
    fallbackDuration: fallbackDuration > initialTime ? fallbackDuration : initialTime,
    initialTime,
    autoPlay,
    unavailable: isUnavailable,
    onEnded: () => onCompleteLesson?.(currentLesson.id),
    onProgress,
  });

  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = volume;
  }, [volume]);
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = isMuted;
  }, [isMuted]);

  const [showSpeedMenu, setShowSpeedMenu] = useState<boolean>(false);
  const [showSubtitleMenu, setShowSubtitleMenu] = useState<boolean>(false);
  const [selectedSubtitleId, setSelectedSubtitleId] = useState<string | null>(
    () => repository.getSubtitlePreference(course.id, initialLessonId) || 'sub-pt',
  );

  const controlsLocked =
    showSpeedMenu ||
    showSubtitleMenu ||
    !playback.isPlaying ||
    playback.hasEnded ||
    playback.hasError ||
    playback.isLoading ||
    playback.isBuffering ||
    playback.isSeeking;
  const { areControlsVisible, showControls } = useAutoHideControls({
    isPlaying: playback.isPlaying,
    keepVisible: controlsLocked,
    autoHideDelayMs: controlsAutoHideDelayMs,
  });
  const controlsVisibilityStyle: React.CSSProperties = {
    opacity: areControlsVisible ? 1 : 0,
    transition: 'opacity 0.25s ease',
    pointerEvents: areControlsVisible ? 'auto' : 'none',
  };

  useEffect(() => {
    const savedSub = repository.getSubtitlePreference(course.id, currentLesson.id);
    setSelectedSubtitleId(savedSub !== undefined ? savedSub : 'sub-pt');
  }, [repository, currentLessonId, course.id, currentLesson.id]);

  useEffect(() => {
    repository.savePlaybackPosition(course.id, currentLesson.id, playback.currentTime);
  }, [repository, playback.currentTime, course.id, currentLesson.id]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) document.exitFullscreen?.();
      else el.requestFullscreen?.();
    } catch {
      /* Fullscreen API indisponível — ignora */
    }
  }, []);

  const handleTimelineSeek = useCallback((time: number) => playback.seek(time), [playback.seek]);

  const handleNextLesson = useCallback(() => {
    setCurrentLessonId((prev) => {
      const idx = allLessons.findIndex((l) => l.id === prev);
      const target = nextLessonIndex(idx, allLessons.length);
      return target === idx ? prev : allLessons[target].id;
    });
  }, [allLessons]);

  const handlePrevLesson = useCallback(() => {
    setCurrentLessonId((prev) => {
      const idx = allLessons.findIndex((l) => l.id === prev);
      const target = previousLessonIndex(idx);
      return target === idx ? prev : allLessons[target].id;
    });
  }, [allLessons]);

  const handleSelectSubtitle = useCallback(
    (subtitleId: string | null) => {
      setSelectedSubtitleId(subtitleId);
      repository.saveSubtitlePreference(course.id, currentLesson.id, subtitleId);
      setShowSubtitleMenu(false);
    },
    [repository, course.id, currentLesson.id],
  );

  const handleSimulateImportSubtitle = useCallback(() => {
    const newTrack: SubtitleTrack = {
      id: `custom-sub-${Date.now()}`,
      label: 'Legenda Externa (.srt)',
      language: 'custom',
      content: 'Legenda externa personalizada importada com sucesso.',
    };
    repository.addCustomSubtitle(course.id, currentLesson.id, newTrack);
    handleSelectSubtitle(newTrack.id);
  }, [repository, course.id, currentLesson.id, handleSelectSubtitle]);

  const retryPlayback = playback.retry;
  const handleReconnect = useCallback(() => {
    setReconnected(true);
    retryPlayback();
  }, [retryPlayback]);

  const availableSubtitles = currentLesson.subtitles ?? DEFAULT_SUBTITLES;
  const activeSubtitle = availableSubtitles.find((s) => s.id === selectedSubtitleId);
  const loadingLabel = loadingLabelFor(currentLessonIndex);

  return {
    videoRef,
    containerRef,
    course,
    currentLesson,
    currentLessonIndex,
    totalLessons: allLessons.length,
    isLastLesson,
    status: playback.status,
    isPlaying: playback.isPlaying,
    currentTime: playback.currentTime,
    duration: playback.duration,
    playbackRate: playback.playbackRate,
    isLoading: playback.isLoading,
    isBuffering: playback.isBuffering,
    isSeeking: playback.isSeeking,
    hasEnded: playback.hasEnded,
    hasError: playback.hasError,
    volume,
    isMuted,
    isFullscreen,
    showSpeedMenu,
    showSubtitleMenu,
    selectedSubtitleId,
    availableSubtitles,
    activeSubtitle,
    areControlsVisible,
    controlsVisibilityStyle,
    loadingLabel,
    play: playback.toggle,
    replay: playback.replay,
    seek: playback.seek,
    skip: playback.skip,
    setPlaybackRate: playback.setPlaybackRate,
    toggleFullscreen,
    setVolume,
    setIsMuted,
    setShowSpeedMenu,
    setShowSubtitleMenu,
    showControls,
    handleForward10: () => playback.skip(10),
    handleRewind10: () => playback.skip(-10),
    handleTimelineSeek,
    handleNextLesson,
    handlePrevLesson,
    handleSelectSubtitle,
    handleSimulateImportSubtitle,
    handleReconnect,
    formatSeconds,
  };
}
