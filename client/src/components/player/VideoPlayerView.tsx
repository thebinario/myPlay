import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Course, Lesson, SubtitleTrack } from '../../types/library';
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Subtitles,
  SkipBack,
  SkipForward,
  AlertTriangle,
  RefreshCw,
  Check,
  Upload,
  Maximize,
  Minimize,
} from 'lucide-react';
import { mockLibraryService } from '../../services/mockData';
import { IconButton } from '../ui/IconButton';
import { ProgressBar } from '../ui/ProgressBar';
import { Spinner } from '../ui/Spinner';
import { useMediaElementPlayback } from './useMediaElementPlayback';
import { useAutoHideControls } from './useAutoHideControls';

interface VideoPlayerViewProps {
  course: Course;
  initialLessonId: string;
  onBack: () => void;
  onCompleteLesson?: (lessonId: string) => void;
  /** Tempo de inatividade antes de ocultar os controles durante a reprodução (ms). */
  controlsAutoHideDelayMs?: number;
  /** Posição de retomada (sobrepõe o progresso persistido), em segundos. */
  resumeTime?: number;
  /** Inicia a reprodução automaticamente ao carregar (usado ao restaurar o mini player). */
  autoPlay?: boolean;
  /** Reporta o estado de reprodução atual (usado pelo mini player). */
  onProgress?: (snapshot: { currentTime: number; isPlaying: boolean }) => void;
}

const LOADING_LABELS = ['Carregando aula...', 'Preparando reprodução...', 'Sincronizando legendas...'];

export const VideoPlayerView: React.FC<VideoPlayerViewProps> = ({
  course,
  initialLessonId,
  onBack,
  onCompleteLesson,
  controlsAutoHideDelayMs,
  resumeTime,
  autoPlay,
  onProgress,
}) => {
  // Lista linear de todas as aulas do curso
  const allLessons: Lesson[] = [];
  course.modules.forEach(m => {
    m.lessons.forEach(l => {
      allLessons.push(l);
    });
  });

  const [currentLessonId, setCurrentLessonId] = useState<string>(initialLessonId);
  const currentLessonIndex = allLessons.findIndex(l => l.id === currentLessonId);
  const currentLesson = allLessons[currentLessonIndex] || allLessons[0];

  const initialTime = useMemo(() => {
    if (resumeTime !== undefined && currentLesson.id === initialLessonId) return resumeTime;
    const saved = mockLibraryService.getPlaybackPosition(course.id, currentLesson.id);
    return saved || currentLesson.lastPlaybackPosition || 0;
  }, [course.id, currentLesson.id, currentLesson.lastPlaybackPosition, resumeTime, initialLessonId]);

  // Estado de erro / arquivo indisponível (reconexão local)
  const [reconnected, setReconnected] = useState(false);
  useEffect(() => {
    setReconnected(false);
  }, [currentLessonId]);
  const isUnavailable = !!currentLesson.isUnavailable && !reconnected;

  // ── Reprodução real via elemento <video> ────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null);
  const fallbackDuration = currentLesson.duration || 0;
  const {
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
    toggle,
    replay,
    seek,
    skip,
    setPlaybackRate,
  } = useMediaElementPlayback({
    videoRef,
    src: currentLesson.videoUrl,
    fallbackDuration: fallbackDuration > initialTime ? fallbackDuration : initialTime,
    initialTime,
    autoPlay,
    unavailable: isUnavailable,
    onEnded: () => onCompleteLesson?.(currentLesson.id),
    onProgress,
  });

  // ── Áudio (volume/mute) ─────────────────────────────────────────────────────
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = volume;
  }, [volume]);
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = isMuted;
  }, [isMuted]);

  // ── Menus ───────────────────────────────────────────────────────────────────
  const [showSpeedMenu, setShowSpeedMenu] = useState<boolean>(false);
  const [showSubtitleMenu, setShowSubtitleMenu] = useState<boolean>(false);
  const [selectedSubtitleId, setSelectedSubtitleId] = useState<string | null>(() => {
    return mockLibraryService.getSubtitlePreference(course.id, initialLessonId) || 'sub-pt';
  });

  // Auto-ocultação dos controles durante a reprodução
  const controlsLocked =
    showSpeedMenu ||
    showSubtitleMenu ||
    !isPlaying ||
    hasEnded ||
    hasError ||
    isLoading ||
    isBuffering ||
    isSeeking;
  const { areControlsVisible, showControls } = useAutoHideControls({
    isPlaying,
    keepVisible: controlsLocked,
    autoHideDelayMs: controlsAutoHideDelayMs,
  });
  const controlsVisibilityStyle: React.CSSProperties = {
    opacity: areControlsVisible ? 1 : 0,
    transition: 'opacity 0.25s ease',
    pointerEvents: areControlsVisible ? 'auto' : 'none',
  };

  // Restaura preferência de legenda ao trocar de aula
  useEffect(() => {
    const savedSub = mockLibraryService.getSubtitlePreference(course.id, currentLesson.id);
    setSelectedSubtitleId(savedSub !== undefined ? savedSub : 'sub-pt');
  }, [currentLessonId, course.id, currentLesson.id]);

  // Persiste progresso no mockLibraryService a cada alteração
  useEffect(() => {
    mockLibraryService.savePlaybackPosition(course.id, currentLesson.id, currentTime);
  }, [currentTime, course.id, currentLesson.id]);

  // ── Tela cheia ──────────────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) document.exitFullscreen?.();
      else el.requestFullscreen?.();
    } catch {
      /* Fullscreen API indisponível — ignora */
    }
  };

  const formatSeconds = (sec: number): string => {
    const safe = Math.max(0, Math.floor(sec));
    const minutes = Math.floor(safe / 60);
    const remainder = Math.floor(safe % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  const play = () => toggle();

  const handleForward10 = () => skip(10);
  const handleRewind10 = () => skip(-10);

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = (e.clientX - rect.left) / rect.width;
    seek(ratio * duration);
  };

  const handleTimelineKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); skip(10); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); skip(-10); }
  };

  const handleNextLesson = () => {
    if (currentLessonIndex < allLessons.length - 1) {
      setCurrentLessonId(allLessons[currentLessonIndex + 1].id);
    }
  };

  const handlePrevLesson = () => {
    if (currentLessonIndex > 0) {
      setCurrentLessonId(allLessons[currentLessonIndex - 1].id);
    }
  };

  const handleSelectSubtitle = (subtitleId: string | null) => {
    setSelectedSubtitleId(subtitleId);
    mockLibraryService.saveSubtitlePreference(course.id, currentLesson.id, subtitleId);
    setShowSubtitleMenu(false);
  };

  const handleSimulateImportSubtitle = () => {
    const newTrack: SubtitleTrack = {
      id: `custom-sub-${Date.now()}`,
      label: 'Legenda Externa (.srt)',
      language: 'custom',
      content: 'Legenda externa personalizada importada com sucesso.',
    };
    mockLibraryService.addCustomSubtitle(course.id, currentLesson.id, newTrack);
    handleSelectSubtitle(newTrack.id);
  };

  const handleReconnect = () => {
    setReconnected(true);
  };

  const availableSubtitles = currentLesson.subtitles || [
    { id: 'sub-pt', label: 'Português (Brasil)', language: 'pt-BR', content: 'Reprodução simulada da MIDOTECA.' },
    { id: 'sub-en', label: 'English', language: 'en', content: 'MIDOTECA simulated playback.' },
  ];

  const activeSubtitle = availableSubtitles.find(s => s.id === selectedSubtitleId);
  const isLastLesson = currentLessonIndex === allLessons.length - 1;
  const loadingLabel = LOADING_LABELS[currentLessonIndex % LOADING_LABELS.length];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', backgroundColor: '#0D111B' }}>
      {/* Top Header bar with Course & Lesson info */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: '#121622',
        }}
      >
        <button
          onClick={onBack}
          aria-label="Voltar para detalhes do curso"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'transparent',
            border: 'none',
            color: '#94A3B8',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            padding: '6px 10px',
            borderRadius: '6px',
          }}
        >
          <ArrowLeft size={16} />
          Voltar
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#A594FF', fontWeight: 600 }}>
            {course.title}
          </span>
          <h2 style={{ fontSize: '15px', color: '#F0F4FC', fontWeight: 700, margin: 0 }}>
            {currentLesson.title}
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            data-testid="player-status"
            style={{
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: hasError ? '#F87171' : hasEnded ? '#10B981' : isPlaying ? '#A594FF' : '#64748B',
            }}
          >
            {hasError ? 'Indisponível' : hasEnded ? 'Concluída' : isLoading ? 'Carregando' : isBuffering ? 'Armazenando' : isSeeking ? 'Buscando' : isPlaying ? 'Reproduzindo' : 'Pausado'}
          </span>
          <span style={{ fontSize: '12px', color: '#64748B' }}>
            Aula {currentLessonIndex + 1} de {allLessons.length}
          </span>
        </div>
      </div>

      {/* Main 16:9 Video Canvas Area */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', overflow: 'hidden' }}>
        <div
          ref={containerRef}
          data-testid="video-player-container"
          data-aspect-ratio="16:9"
          data-status={status}
          onMouseMove={showControls}
          style={{
            width: '100%',
            maxWidth: '1060px',
            aspectRatio: '16 / 9',
            backgroundColor: '#070A10',
            borderRadius: isFullscreen ? 0 : '14px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 40px rgba(165, 148, 255, 0.08)',
          }}
        >
          {/* Elemento de vídeo real */}
          <video
            ref={videoRef}
            src={currentLesson.videoUrl}
            poster={course.coverUrl}
            playsInline
            preload="metadata"
            data-testid="player-video"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              backgroundColor: '#000000',
              zIndex: 0,
            }}
          />

          {/* Video Mock Content / Center State */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
            {hasError ? (
              <div
                data-testid="player-error"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                  backgroundColor: 'rgba(20, 26, 40, 0.95)',
                  padding: '32px',
                  borderRadius: '12px',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  maxWidth: '440px',
                  textAlign: 'center',
                }}
              >
                <AlertTriangle size={36} color="#EF4444" />
                <h3 style={{ color: '#F87171', fontSize: '16px', fontWeight: 600 }}>
                  Arquivo indisponível ou HD desconectado
                </h3>
                <p style={{ color: '#94A3B8', fontSize: '13px' }}>
                  O arquivo da aula não foi localizado no diretório de origem. Verifique se o pendrive ou HD externo está conectado.
                </p>
                <button
                  onClick={handleReconnect}
                  aria-label="Tentar reconectar"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#A594FF',
                    color: '#0D111B',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    marginTop: '8px',
                  }}
                >
                  <RefreshCw size={14} />
                  Tentar reconectar
                </button>
              </div>
            ) : isLoading ? (
              <div
                data-testid="player-loading"
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', color: '#94A3B8' }}
              >
                <Spinner size={38} />
                <span style={{ fontSize: '13px', fontWeight: 500 }}>{loadingLabel}</span>
              </div>
            ) : hasEnded ? (
              <div
                data-testid="player-ended"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                  textAlign: 'center',
                }}
              >
                <Check size={36} color="#10B981" />
                <h3 style={{ color: '#F0F4FC', fontSize: '16px', fontWeight: 600 }}>Aula concluída</h3>
                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                  <button
                    onClick={replay}
                    aria-label="Reproduzir novamente"
                    style={endedButtonStyle}
                  >
                    <RotateCcw size={14} />
                    Reproduzir novamente
                  </button>
                  {!isLastLesson && (
                    <button
                      onClick={handleNextLesson}
                      aria-label="Ir para a próxima aula"
                      style={{ ...endedButtonStyle, backgroundColor: 'transparent', color: '#E2E8F0', border: '1px solid rgba(255,255,255,0.15)' }}
                    >
                      Próxima aula
                      <SkipForward size={14} />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div
                onClick={play}
                role="button"
                aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
                style={{
                  ...controlsVisibilityStyle,
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(165, 148, 255, 0.2)',
                  backdropFilter: 'blur(10px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  border: '1px solid rgba(165, 148, 255, 0.4)',
                  transition: 'transform 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                {isBuffering ? (
                  <Spinner size={30} />
                ) : isPlaying ? (
                  <Pause size={30} color="#A594FF" fill="#A594FF" />
                ) : (
                  <Play size={30} color="#A594FF" fill="#A594FF" style={{ marginLeft: '4px' }} />
                )}
              </div>
            )}

            {/* Buffer overlay */}
            {isBuffering && (
              <div
                data-testid="player-buffering"
                style={{
                  position: 'absolute',
                  bottom: '18px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  borderRadius: '999px',
                  padding: '5px 12px',
                  fontSize: '11px',
                  color: '#E2E8F0',
                }}
              >
                <Spinner size={12} />
                Armazenando em buffer...
              </div>
            )}

            {/* Seek overlay */}
            {isSeeking && (
              <div
                data-testid="player-seeking"
                style={{
                  position: 'absolute',
                  top: '16px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  borderRadius: '8px',
                  padding: '6px 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#F0F4FC',
                }}
              >
                {formatSeconds(currentTime)}
              </div>
            )}

            {/* Display Active Subtitle overlay */}
            {activeSubtitle && !hasError && (
              <div
                data-testid="subtitles-display"
                style={{
                  position: 'absolute',
                  bottom: '24px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: 'rgba(0, 0, 0, 0.85)',
                  backdropFilter: 'blur(6px)',
                  color: '#FFFFFF',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  textAlign: 'center',
                  maxWidth: '85%',
                  letterSpacing: '0.2px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                {activeSubtitle.content || `[${activeSubtitle.label}]: Reproduzindo conteúdo da aula`}
              </div>
            )}
          </div>

          {/* Floating Contextual Subtitles Menu */}
          {showSubtitleMenu && (
            <div
              data-testid="subtitles-floating-menu"
              style={{
                position: 'absolute',
                bottom: '72px',
                right: '110px',
                width: '240px',
                backgroundColor: '#141A28',
                border: '1px solid rgba(165, 148, 255, 0.3)',
                borderRadius: '10px',
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6), 0 0 16px rgba(165, 148, 255, 0.15)',
                padding: '8px',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#A594FF',
                  padding: '6px 8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                  marginBottom: '4px',
                }}
              >
                Legendas e Áudio
              </div>

              <IconButton
                icon={Check}
                onClick={() => handleSelectSubtitle(null)}
                variant="violet"
              >
                <span>Desativar legendas</span>
                {selectedSubtitleId === null && <Check size={14} color="#A594FF" />}
              </IconButton>

              {availableSubtitles.map(track => {
                const isSelected = selectedSubtitleId === track.id;
                return (
                  <IconButton
                    icon={Subtitles}
                    key={track.id}
                    onClick={() => handleSelectSubtitle(track.id)}
                    variant={isSelected ? 'violet' : 'muted'}
                  >
                    <span>{track.label}</span>
                    {isSelected && <Check size={14} color="#A594FF" />}
                  </IconButton>
                );
              })}

              <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', margin: '4px 0' }} />

              <IconButton
                icon={Upload}
                onClick={handleSimulateImportSubtitle}
                variant="muted"
                onMouseEnter={(e) => { e.currentTarget.style.color = '#FFFFFF'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#94A3B8'; }}
              >
                <Upload size={13} />
                <span>Importar arquivo .srt / .vtt</span>
              </IconButton>
            </div>
          )}

          {/* Speed Selector Menu Popover */}
          {showSpeedMenu && (
            <div
              data-testid="speed-floating-menu"
              style={{
                position: 'absolute',
                bottom: '72px',
                right: '60px',
                width: '120px',
                backgroundColor: '#141A28',
                border: '1px solid rgba(165, 148, 255, 0.3)',
                borderRadius: '10px',
                padding: '6px',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              {[0.75, 1, 1.25, 1.5, 2].map(speed => (
                <IconButton
                  icon={RotateCcw}
                  key={speed}
                  onClick={() => {
                    setPlaybackRate(speed);
                    setShowSpeedMenu(false);
                  }}
                  variant={playbackRate === speed ? 'violet' : 'muted'}
                >
                  {speed}x
                </IconButton>
              ))}
            </div>
          )}

          {/* Bottom Player Controls Overlay */}
          <div
            data-testid="player-controls"
            style={{
              ...controlsVisibilityStyle,
              position: 'relative',
              zIndex: 2,
              background: 'linear-gradient(to top, rgba(7, 10, 16, 0.95) 0%, rgba(7, 10, 16, 0.4) 70%, transparent 100%)',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            {/* Interactive Timeline Progress Bar */}
            <div
              role="slider"
              aria-label="Linha do tempo"
              aria-valuemin={0}
              aria-valuemax={Math.round(duration)}
              aria-valuenow={Math.round(currentTime)}
              tabIndex={0}
              data-testid="player-timeline"
              onClick={handleTimelineClick}
              onKeyDown={handleTimelineKeyDown}
              style={{ cursor: 'pointer', padding: '6px 0' }}
            >
              <ProgressBar
                value={currentTime}
                max={duration}
                width="100%"
                height="6px"
                bgColor="rgba(255, 255, 255, 0.15)"
                progressColor="#A594FF"
              />
            </div>

            {/* Bottom Controls Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <IconButton
                  icon={SkipBack}
                  onClick={handlePrevLesson}
                  disabled={currentLessonIndex === 0}
                  aria-label="Aula anterior"
                  variant={currentLessonIndex === 0 ? 'muted' : 'default'}
                >
                  <SkipBack size={18} />
                </IconButton>

                <IconButton
                  icon={RotateCcw}
                  onClick={handleRewind10}
                  aria-label="Retroceder 10 segundos"
                  title="Retroceder 10s"
                  variant="default"
                >
                  <RotateCcw size={18} />
                </IconButton>

                <IconButton
                  icon={isPlaying ? Pause : Play}
                  onClick={play}
                  aria-label={isPlaying ? 'Pausar vídeo' : 'Reproduzir vídeo'}
                  title={isPlaying ? 'Pausar' : 'Reproduzir'}
                  variant="violet"
                >
                  {isPlaying ? (
                    <Pause size={18} fill="#0D111B" />
                  ) : (
                    <Play size={18} fill="#0D111B" style={{ marginLeft: '2px' }} />
                  )}
                </IconButton>

                <IconButton
                  icon={RotateCw}
                  onClick={handleForward10}
                  aria-label="Avançar 10 segundos"
                  title="Avançar 10s"
                  variant="default"
                >
                  <RotateCw size={18} />
                </IconButton>

                <IconButton
                  icon={SkipForward}
                  onClick={handleNextLesson}
                  disabled={isLastLesson}
                  aria-label="Próxima aula"
                  variant={isLastLesson ? 'muted' : 'default'}
                >
                  <SkipForward size={18} />
                </IconButton>

                <div style={{ marginLeft: '8px', fontSize: '13px', color: '#94A3B8' }}>
                  <span data-testid="current-time" style={{ color: '#F0F4FC', fontWeight: 600 }}>
                    {formatSeconds(currentTime)}
                  </span>
                  {' '}
                  <span>{formatSeconds(duration)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <IconButton
                    icon={isMuted ? VolumeX : Volume2}
                    onClick={() => setIsMuted(prev => !prev)}
                    aria-label={isMuted ? 'Desmutar' : 'Mutar'}
                    variant="muted"
                  >
                    {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  </IconButton>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => {
                      setVolume(parseFloat(e.target.value));
                      if (isMuted) setIsMuted(false);
                    }}
                    aria-label="Controle de volume"
                    style={{
                      width: '60px',
                      height: '4px',
                      accentColor: '#A594FF',
                      cursor: 'pointer',
                    }}
                  />
                </div>

                <IconButton
                  icon={Subtitles}
                  onClick={() => {
                    setShowSubtitleMenu(prev => !prev);
                    setShowSpeedMenu(false);
                  }}
                  aria-label="Legendas e idiomas (CC)"
                  title="Legendas (CC)"
                  variant={selectedSubtitleId ? 'violet' : 'muted'}
                >
                  <Subtitles size={17} />
                  CC
                </IconButton>

                <IconButton
                  icon={RotateCcw}
                  onClick={() => {
                    setShowSpeedMenu(prev => !prev);
                    setShowSubtitleMenu(false);
                  }}
                  aria-label={`Velocidade de reprodução: ${playbackRate}x`}
                  title="Velocidade"
                  variant="muted"
                >
                  {playbackRate}x
                </IconButton>

                <IconButton
                  icon={isFullscreen ? Minimize : Maximize}
                  onClick={toggleFullscreen}
                  aria-label={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
                  title="Tela cheia"
                  variant="muted"
                >
                  {isFullscreen ? <Minimize size={17} /> : <Maximize size={17} />}
                </IconButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const endedButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  backgroundColor: '#A594FF',
  color: '#0D111B',
  border: 'none',
  borderRadius: '8px',
  padding: '8px 16px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
};
