import type { Meta, StoryObj } from '@storybook/react';
import { LibraryContentsList } from './LibraryContentsList';
import {
  MOCK_COURSES,
  MOCK_DOCUMENTS,
  MOCK_MOVIES,
} from '@/modules/library/infrastructure/mock-library-repository';

const meta: Meta<typeof LibraryContentsList> = {
  title: 'Library/LibraryContentsList',
  component: LibraryContentsList,
  tags: ['autodocs'],
  parameters: { layout: 'padded', background: { default: '#0D111B' } },
  argTypes: {
    items: { control: false },
    onSelectCourse: { action: 'select-course' },
    onPlayLesson: { action: 'play-lesson' },
    onOpenMovie: { action: 'open-movie' },
    onOpenDocument: { action: 'open-document' },
  },
};

export default meta;
type Story = StoryObj<typeof LibraryContentsList>;

export const ModulesWithVideosAndPdfs: Story = {
  args: {
    items: [MOCK_COURSES[0], MOCK_MOVIES[0], MOCK_DOCUMENTS[0]],
    onSelectCourse: () => {},
    onPlayLesson: () => {},
    onOpenMovie: () => {},
    onOpenDocument: () => {},
  },
};

export const StandaloneLibraryContents: Story = {
  args: {
    items: [MOCK_MOVIES[0], MOCK_DOCUMENTS[0]],
    onSelectCourse: () => {},
    onPlayLesson: () => {},
    onOpenMovie: () => {},
    onOpenDocument: () => {},
  },
};
