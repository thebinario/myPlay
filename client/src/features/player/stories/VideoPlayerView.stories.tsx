import type { Meta, StoryObj } from '@storybook/react';
import { VideoPlayerView } from '../../../components/player/VideoPlayerView';
import { mockLibraryService } from '../../../services/mockData';
import { Course, Lesson } from '../../../types/library';

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
  },
};

export default meta;
type Story = StoryObj<typeof VideoPlayerView>;

export const Default: Story = {
  args: {
    course: mockCourse,
    initialLessonId: mockInitialLessonId,
    onBack: () => {},
    onCompleteLesson: () => {},
  },
};

export const LoadingState: Story = {
  parameters: {
    backgrounds: { default: 'custom' },
    background: {
      name: 'dark',
      value: '#0D111B',
    },
  },
  args: {
    course: mockCourse,
    initialLessonId: mockInitialLessonId,
    onBack: () => {},
    onCompleteLesson: () => {},
  },
};

export const UnavailableState: Story = {
  parameters: {
    backgrounds: { default: 'custom' },
    background: {
      name: 'dark',
      value: '#0D111B',
    },
  },
  args: {
    course: mockCourse,
    initialLessonId: mockInitialLessonId,
    onBack: () => {},
    onCompleteLesson: () => {},
  },
};