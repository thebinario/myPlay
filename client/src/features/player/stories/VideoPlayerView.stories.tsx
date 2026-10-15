import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect, waitFor } from 'storybook/test';
import { VideoPlayerView } from '../../../components/player/VideoPlayerView';
import { Course } from '../../../types/library';

const mockCourse: Course = {
  id: 'course-react-desktop',
  type: 'course',
  title: 'Arquitetura Desktop Moderna com Tauri & React',
  description: 'Aprenda a construir aplicativos desktop de alta performance utilizando React, TypeScript, Rust e Tauri com TDD e design minimalista.',
  category: 'Desenvolvimento',
  coverUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80',
  totalDuration: 14400,
  progress: 45,
  tags: ['React', 'Tauri', 'TypeScript', 'Desktop'],
  createdAt: '2026-02-10T10:00:00Z',
  modules: [
    {
      id: 'mod-1',
      courseId: 'course-react-desktop',
      title: 'Módulo 1: Fundamentos e Arquitetura',
      order: 1,
      lessons: [
        {
          id: 'les-1-1',
          moduleId: 'mod-1',
          title: '1.1 Visão Geral e Comparação com Electron',
          duration: 900,
          completed: true,
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          order: 1,
          lastPlaybackPosition: 120,
          subtitles: [
            { id: 'sub-pt', label: 'Português (Brasil)', language: 'pt-BR', isDefault: true, content: 'Nesta aula discutiremos Tauri vs Electron.' },
            { id: 'sub-en', label: 'English', language: 'en', content: 'In this lesson we compare Tauri with Electron.' },
          ],
          materials: []
        }
      ]
    }
  ]
};

const unavailableCourse: Course = {
  ...mockCourse,
  id: 'course-unavailable',
  title: 'Curso com aula indisponível',
  modules: mockCourse.modules.map(module => ({
    ...module,
    lessons: module.lessons.map(lesson => ({ ...lesson, isUnavailable: true })),
  })),
};

// Aula cuja posição de retomada já é o fim → inicia no estado "ended".
const endedCourse: Course = {
  ...mockCourse,
  id: 'course-ended',
  title: 'Curso com aula finalizada',
  modules: mockCourse.modules.map(module => ({
    ...module,
    lessons: module.lessons.map(lesson => ({ ...lesson, lastPlaybackPosition: lesson.duration })),
  })),
};

const mockInitialLessonId = 'les-1-1';

const meta: Meta<typeof VideoPlayerView> = {
  title: 'Player/VideoPlayerView',
  component: VideoPlayerView,
  tags: ['autodocs'],
  parameters: {
    controls: { sortBy: ['required', 'default'] },
    background: { default: '#0D111B' },
  },
  argTypes: {
    course: { control: false },
    initialLessonId: { control: { type: 'text' } },
    onBack: { action: 'back' },
    onCompleteLesson: { action: 'complete-lesson' },
    loadingDelayMs: { control: { type: 'number' } },
    bufferingDelayMs: { control: { type: 'number' } },
    seekDelayMs: { control: { type: 'number' } },
  },
};

export default meta;
type Story = StoryObj<typeof VideoPlayerView>;

const baseArgs = {
  course: mockCourse,
  initialLessonId: mockInitialLessonId,
  onBack: () => {},
  onCompleteLesson: () => {},
};

/** Mídia carregada e pronta (pausada na posição de retomada). */
export const Ready: Story = {
  args: { ...baseArgs, loadingDelayMs: 0 },
};

/** Carregando a mídia (fase inicial do ciclo). */
export const Loading: Story = {
  args: { ...baseArgs, loadingDelayMs: 600000 },
};

/** Reproduzindo após o buffer inicial. */
export const Playing: Story = {
  args: { ...baseArgs, loadingDelayMs: 0, bufferingDelayMs: 60 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /reproduzir vídeo/i }));
    await canvas.findByRole('button', { name: /pausar vídeo/i });
    await waitFor(() => expect(canvas.getByTestId('player-status').textContent).toBe('Reproduzindo'));
  },
};

/** Buffer/armazenamento durante a reprodução. */
export const Buffering: Story = {
  args: { ...baseArgs, loadingDelayMs: 0, bufferingDelayMs: 600000 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /reproduzir vídeo/i }));
    await expect(canvas.getByTestId('player-buffering')).toBeTruthy();
    await expect(canvas.getByTestId('player-status').textContent).toBe('Armazenando');
  },
};

/** Busca/seek na linha do tempo. */
export const Seeking: Story = {
  args: { ...baseArgs, loadingDelayMs: 0, seekDelayMs: 600000 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /avançar 10 segundos/i }));
    await expect(canvas.getByTestId('player-seeking')).toBeTruthy();
    await expect(canvas.getByTestId('player-status').textContent).toBe('Buscando');
  },
};

/** Fim da aula com opções de replay / próxima. */
export const Ended: Story = {
  args: { ...baseArgs, course: endedCourse, loadingDelayMs: 0 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('player-ended')).toBeTruthy();
    await expect(canvas.getByTestId('player-status').textContent).toBe('Concluída');
  },
};

/** Erro: arquivo indisponível / HD desconectado. */
export const UnavailableState: Story = {
  args: { ...baseArgs, course: unavailableCourse, loadingDelayMs: 0 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('player-error')).toBeTruthy();
    await expect(canvas.getByRole('button', { name: /tentar reconectar/i })).toBeTruthy();
  },
};

/** Menu contextual de legendas aberto. */
export const SubtitleMenuOpen: Story = {
  args: { ...baseArgs, loadingDelayMs: 0 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /legendas e idiomas \(cc\)/i }));
    await expect(canvas.getByTestId('subtitles-floating-menu')).toBeTruthy();
  },
};

/** Menu de velocidade de reprodução aberto. */
export const SpeedMenuOpen: Story = {
  args: { ...baseArgs, loadingDelayMs: 0 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /velocidade de reprodução: 1x/i }));
    await expect(canvas.getByTestId('speed-floating-menu')).toBeTruthy();
  },
};
