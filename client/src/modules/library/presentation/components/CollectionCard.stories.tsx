import type { Meta, StoryObj } from '@storybook/react';
import type React from 'react';
import { CollectionCard } from '@/modules/library/presentation/components/CollectionCard';
import { MOCK_COLLECTIONS } from '@/modules/library/infrastructure/mock-collections';
import type { Collection } from '@/core/domain/collection';

const meta: Meta<typeof CollectionCard> = {
  title: 'Library/CollectionCard',
  component: CollectionCard,
  tags: ['autodocs'],
  parameters: {
    background: { default: '#0D111B' },
    layout: 'centered',
  },
  argTypes: {
    collection: { control: false },
    onOpen: { action: 'open-collection' },
  },
};

export default meta;
type Story = StoryObj<typeof CollectionCard>;

export const Default: Story = {
  args: {
    collection: MOCK_COLLECTIONS[0],
    onOpen: () => {},
  },
};

const Grid: React.FC<{ collections: Collection[] }> = ({ collections }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: 16,
      width: 640,
    }}
  >
    {collections.map((collection) => (
      <CollectionCard key={collection.id} collection={collection} onOpen={() => {}} />
    ))}
  </div>
);

export const AllCollections: Story = {
  render: () => <Grid collections={MOCK_COLLECTIONS} />,
};
