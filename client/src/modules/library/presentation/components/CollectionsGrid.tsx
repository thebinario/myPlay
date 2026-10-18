import React from 'react';
import type { Collection } from '@/core/domain/collection';
import { CollectionCard } from '@/modules/library/presentation/components/CollectionCard';

interface CollectionsGridProps {
  collections: Collection[];
  onOpenCollection: (collectionId: string) => void;
  title?: string;
}

/**
 * Grade de coleções exibida no topo da biblioteca. Não renderiza nada quando não
 * há coleções, mantendo o layout atual intacto para bibliotecas sem agrupamento.
 */
export const CollectionsGrid: React.FC<CollectionsGridProps> = ({
  collections,
  onOpenCollection,
  title = 'Coleções',
}) => {
  if (collections.length === 0) return null;

  return (
    <section style={styles.section} aria-label={title}>
      <h2 style={styles.heading}>{title}</h2>
      <div style={styles.grid}>
        {collections.map((collection) => (
          <CollectionCard key={collection.id} collection={collection} onOpen={onOpenCollection} />
        ))}
      </div>
    </section>
  );
};

const styles: Record<string, React.CSSProperties> = {
  section: {
    marginBottom: 28,
  },
  heading: {
    fontSize: 15,
    fontWeight: 600,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 12,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 16,
  },
};
