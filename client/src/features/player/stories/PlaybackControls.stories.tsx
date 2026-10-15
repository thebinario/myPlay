import type { Meta, StoryObj } from '@storybook/react';
import { PlaybackControls } from '../../../components/player/PlaybackControls';

const meta: Meta<typeof PlaybackControls> = {
  title: 'Player/PlaybackControls',
  component: PlaybackControls,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    background: { default: '#070A10' },
  },
  argTypes: {
    controlsVisibilityStyle: { control: false },
    formatSeconds: { control: false },
    onTogglePlay: { action: 'togglePlay' },
    onRewind: { action: 'rewind' },
    onForward: { action: 'forward' },
    onPrevLesson: { action: 'prevLesson' },
    onNextLesson: { action: 'nextLesson' },
    onTimelineClick: { action: 'seek' },
    onTimelineKeyDown: { action: 'seekKey' },
    onVolumeChange: { action: 'volume' },
    onToggleMute: { action: 'toggleMute' },
    onToggleSubtitleMenu: { action: 'toggleSubtitle' },
    onToggleSpeedMenu: { action: 'toggleSpeed' },
    onToggleFullscreen: { action: 'toggleFullscreen' },
  },
};

export default meta;
type Story = StoryObj<typeof PlaybackControls>;

const formatSeconds = (sec: number) => {
  const safe = Math.max(0, Math.floor(sec));
  const minutes = Math.floor(safe / 60);
  const remainder = Math.floor(safe % 60);
  return `${minutes.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
};

const baseArgs: React.ComponentProps<typeof PlaybackControls> = {
  controlsVisibilityStyle: {},
  currentTime: 120,
  duration: 900,
  playbackRate: 1,
  isPlaying: false,
  isMuted: false,
  volume: 1,
  isFullscreen: false,
  selectedSubtitleId: 'sub-pt',
  isFirstLesson: false,
  isLastLesson: false,
  formatSeconds,
  onTogglePlay: () => {},
  onRewind: () => {},
  onForward: () => {},
  onPrevLesson: () => {},
  onNextLesson: () => {},
  onTimelineClick: () => {},
  onTimelineKeyDown: () => {},
  onVolumeChange: () => {},
  onToggleMute: () => {},
  onToggleSubtitleMenu: () => {},
  onToggleSpeedMenu: () => {},
  onToggleFullscreen: () => {},
};

export const Paused: Story = { args: { ...baseArgs } };

export const Playing: Story = { args: { ...baseArgs, isPlaying: true, currentTime: 360 } };

export const Muted: Story = { args: { ...baseArgs, isMuted: true, selectedSubtitleId: null } };
