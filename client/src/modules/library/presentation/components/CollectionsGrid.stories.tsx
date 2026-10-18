import type { Meta, StoryObj } from '@storybook/react';
import { CollectionsGrid } from '@/modules/library/presentation/components/CollectionsGrid';
import { MOCK_COLLECTIONS } from '@/modules/library/infrastructure/mock-collections';

const meta: Meta<typeof CollectionsGrid> = {
  title: 'Library/CollectionsGrid',
  component: CollectionsGrid,
  tags: ['autodocs'],
  parameters: {
    background: { default: '#0D111B' },
    layout: 'fullscreen',
  },
  argTypes: {
    collections: { control: false },
    onOpenCollection: { action: 'open-collection' },
  },
  decorators: [
    (Story) => (
      <div style={{ padding: 32, maxWidth: 960 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CollectionsGrid>;

export const Default: Story = {
  args: {
    collections: MOCK_COLLECTIONS,
    onOpenCollection: () => {},
  },
};

export const Empty: Story = {
  args: {
    collections: [],
    onOpenCollection: () => {},
  },
};
