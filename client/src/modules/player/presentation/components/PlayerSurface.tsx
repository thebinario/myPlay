import React from 'react';
import { Pause, Play } from 'lucide-react';
import { Spinner } from '@/shared/ui/components/Spinner';
import { PlayerUnavailableState } from '@/modules/player/presentation/components/PlayerUnavailableState';
import { PlayerLoadingState } from '@/modules/player/presentation/components/PlayerLoadingState';
import { PlayerEndedState } from '@/modules/player/presentation/components/PlayerEndedState';
import { SubtitleMenu } from '@/modules/player/presentation/components/SubtitleMenu';
import { SpeedMenu } from '@/modules/player/presentation/components/SpeedMenu';
import { PlaybackControls } from '@/modules/player/presentation/components/PlaybackControls';
import type { VideoPlayerState } from '@/modules/player/presentation/hooks/useVideoPlayer';

interface PlayerSurfaceProps {
  player: VideoPlayerState;
}

export const PlayerSurface: React.FC<PlayerSurfaceProps> = ({ player }) => {
  const {
    course,
    currentLesson,
    isLastLesson,
    isPlaying,
    isBuffering,
    isSeeking,
    isLoading,
    hasEnded,
    hasError,
    errorInfo,
    currentTime,
    status,
    activeSubtitle,
    controlsVisibilityStyle,
    loadingLabel,
    showSubtitleMenu,
    showSpeedMenu,
    selectedSubtitleId,
    availableSubtitles,
    playbackRate,
    duration,
    volume,
    isMuted,
    isFullscreen,
    currentLessonIndex,
    videoRef,
    containerRef,
    formatSeconds,
    showControls,
    play,
    replay,
    setPlaybackRate,
    setIsMuted,
    setVolume,
    setShowSubtitleMenu,
    setShowSpeedMenu,
    toggleFullscreen,
    handleForward10,
    handleRewind10,
    handleNextLesson,
    handlePrevLesson,
    handleSelectSubtitle,
    handleSimulateImportSubtitle,
    handleReconnect,
    handleTimelineSeek,
  } = player;

  return (
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

      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {hasError ? (
          <PlayerUnavailableState errorInfo={errorInfo} onReconnect={handleReconnect} />
        ) : isLoading ? (
          <PlayerLoadingState label={loadingLabel} />
        ) : hasEnded ? (
          <PlayerEndedState
            isLastLesson={isLastLesson}
            onReplay={replay}
            onNextLesson={handleNextLesson}
          />
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
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
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

      {showSubtitleMenu && (
        <SubtitleMenu
          subtitles={availableSubtitles}
          selectedSubtitleId={selectedSubtitleId}
          onSelect={handleSelectSubtitle}
          onImport={handleSimulateImportSubtitle}
        />
      )}

      {showSpeedMenu && (
        <SpeedMenu
          playbackRate={playbackRate}
          onSelect={(rate) => {
            setPlaybackRate(rate);
            setShowSpeedMenu(false);
          }}
        />
      )}

      <PlaybackControls
        controlsVisibilityStyle={controlsVisibilityStyle}
        currentTime={currentTime}
        duration={duration}
        playbackRate={playbackRate}
        isPlaying={isPlaying}
        isMuted={isMuted}
        volume={volume}
        isFullscreen={isFullscreen}
        selectedSubtitleId={selectedSubtitleId}
        isFirstLesson={currentLessonIndex === 0}
        isLastLesson={isLastLesson}
        formatSeconds={formatSeconds}
        onTogglePlay={play}
        onRewind={handleRewind10}
        onForward={handleForward10}
        onPrevLesson={handlePrevLesson}
        onNextLesson={handleNextLesson}
        onTimelineSeek={handleTimelineSeek}
        onVolumeChange={(next) => {
          setVolume(next);
          if (isMuted) setIsMuted(false);
        }}
        onToggleMute={() => setIsMuted((prev) => !prev)}
        onToggleSubtitleMenu={() => {
          setShowSubtitleMenu((prev) => !prev);
          setShowSpeedMenu(false);
        }}
        onToggleSpeedMenu={() => {
          setShowSpeedMenu((prev) => !prev);
          setShowSubtitleMenu(false);
        }}
        onToggleFullscreen={toggleFullscreen}
      />
    </div>
  );
};
