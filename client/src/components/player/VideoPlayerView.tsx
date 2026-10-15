import React, { useState, useEffect, useRef } from 'react';
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
  Upload 
} from 'lucide-react';
import { mockLibraryService } from '../../services/mockData';
import { IconButton } from '../ui/IconButton';
import { ProgressBar } from '../ui/ProgressBar';

interface VideoPlayerViewProps {
  course: Course;
  initialLessonId: string;
  onBack: () => void;
  onCompleteLesson?: (lessonId: string) => void;
}

export const VideoPlayerView: React.FC<VideoPlayerViewProps> = ({
  course,
  initialLessonId,
  onBack,
  onCompleteLesson,
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

  // Estado do motor de reprodução simulado
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(() => {
    return mockLibraryService.getPlaybackPosition(course.id, initialLessonId) || 0;
  });
  const [duration, setDuration] = useState<number>(() => currentLesson.duration || 900);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState<boolean>(false);

  // Estado de legendas (CC flutuante)
  const [showSubtitleMenu, setShowSubtitleMenu] = useState<boolean>(false);
  const [selectedSubtitleId, setSelectedSubtitleId] = useState<string | null>(() => {
    return mockLibraryService.getSubtitlePreference(course.id, initialLessonId) || 'sub-pt';
  });

  // Estado de erro / arquivo indisponível
  const [isUnavailable, setIsUnavailable] = useState<boolean>(!!currentLesson.isUnavailable);

  // Timer para simulação de reprodução quando isPlaying for true
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Atualiza tempo e restaura preferência ao trocar de aula
  useEffect(() => {
    const savedPos = mockLibraryService.getPlaybackPosition(course.id, currentLesson.id);
    setCurrentTime(savedPos);
    setDuration(currentLesson.duration || 900);
    setIsUnavailable(!!currentLesson.isUnavailable);
    setIsPlaying(false);

    const savedSub = mockLibraryService.getSubtitlePreference(course.id, currentLesson.id);
    setSelectedSubtitleId(savedSub !== undefined ? savedSub : 'sub-pt');
  }, [currentLessonId, course.id]);

  // Persiste progresso no mockLibraryService a cada alteração
  useEffect(() => {
    mockLibraryService.savePlaybackPosition(course.id, currentLesson.id, currentTime);
  }, [currentTime, course.id, currentLesson.id]);

  // Simulação de playback com timer
  useEffect(() => {
    if (isPlaying && !isUnavailable) {
      intervalRef.current = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= duration) {
            setIsPlaying(false);
            if (onCompleteLesson) onCompleteLesson(currentLesson.id);
            return duration;
          }
          return prev + 1;
        });
      }, 1000 / playbackRate);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, isUnavailable, duration, playbackRate, onCompleteLesson, currentLesson.id]);

  const formatSeconds = (sec: number): string => {
    const minutes = Math.floor(sec / 60);
    const remainder = Math.floor(sec % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    if (isUnavailable) return;
    setIsPlaying(prev => !prev);
  };

  const handleForward10 = () => {
    setCurrentTime(prev => Math.min(prev + 10, duration));
  };

  const handleRewind10 = () => {
    setCurrentTime(prev => Math.max(prev - 10, 0));
  };

  // Mouse click handler for seeking within the video

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
    setShowSubtitleMenu(false); // Fechamento automático em 1 clique
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
    setIsUnavailable(false);
  };

  // Legendas da aula atual
  const availableSubtitles = currentLesson.subtitles || [
    { id: 'sub-pt', label: 'Português (Brasil)', language: 'pt-BR', content: 'Reprodução simulada da MIDOTECA.' },
    { id: 'sub-en', label: 'English', language: 'en', content: 'MIDOTECA simulated playback.' },
  ];

  const activeSubtitle = availableSubtitles.find(s => s.id === selectedSubtitleId);

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

        <div style={{ fontSize: '12px', color: '#64748B' }}>
          Aula {currentLessonIndex + 1} de {allLessons.length}
        </div>
      </div>

      {/* Main 16:9 Video Canvas Area */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', overflow: 'hidden' }}>
        <div
          data-testid="video-player-container"
          data-aspect-ratio="16:9"
          style={{
            width: '100%',
            maxWidth: '1060px',
            aspectRatio: '16 / 9',
            backgroundColor: '#070A10',
            borderRadius: '14px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 40px rgba(165, 148, 255, 0.08)',
          }}
        >
          {/* Video Mock Content / Center State */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            {isUnavailable ? (
              <div 
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
            ) : (
              <div 
                onClick={handlePlayPause}
                style={{
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
                {isPlaying ? (
                  <Pause size={30} color="#A594FF" fill="#A594FF" />
                ) : (
                  <Play size={30} color="#A594FF" fill="#A594FF" style={{ marginLeft: '4px' }} />
                )}
              </div>
            )}

            {/* Display Active Subtitle overlay */}
            {activeSubtitle && !isUnavailable && (
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

          {/* Floating Contextual Subtitles Menu (Tela 11 - Popover posicionado acima do botão CC) */}
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

              {/* Option to Disable */}
              <IconButton
                icon={Check}
                onClick={() => handleSelectSubtitle(null)}
                variant="violet"
              >
                <span>Desativar legendas</span>
                {selectedSubtitleId === null && <Check size={14} color="#A594FF" />}
              </IconButton>

              {/* Available Tracks */}
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

              {/* Simulate Import SRT */}
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
            style={{
              background: 'linear-gradient(to top, rgba(7, 10, 16, 0.95) 0%, rgba(7, 10, 16, 0.4) 70%, transparent 100%)',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            {/* Interactive Timeline Progress Bar */}
            <ProgressBar
              value={currentTime}
              max={duration}
              width="100%"
              height="6px"
              bgColor="rgba(255, 255, 255, 0.15)"
              progressColor="#A594FF"
            />

            {/* Bottom Controls Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {/* Left group: Navigation, Play/Pause, Skip 10, Timers */}
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
                  onClick={handlePlayPause}
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
                  disabled={currentLessonIndex === allLessons.length - 1}
                  aria-label="Próxima aula"
                  variant={currentLessonIndex === allLessons.length - 1 ? 'muted' : 'default'}
                >
                  <SkipForward size={18} />
                </IconButton>

                {/* Timers */}
                <div style={{ marginLeft: '8px', fontSize: '13px', color: '#94A3B8' }}>
                  <span data-testid="current-time" style={{ color: '#F0F4FC', fontWeight: 600 }}>
                    {formatSeconds(currentTime)}
                  </span>
                  {' '}
                  <span>{formatSeconds(duration)}</span>
                </div>
              </div>

              {/* Right group: Volume, CC Subtitles, Speed */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                {/* Volume toggle & slider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <IconButton
                    icon={Volume2}
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

                {/* CC Subtitles Button (Abre menu flutuante contextual) */}
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

                {/* Playback speed selector */}
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};