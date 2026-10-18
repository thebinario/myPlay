import React from 'react';
import { Clock, Library } from 'lucide-react';
import type { Collection } from '@/core/domain/collection';

interface CollectionCardProps {
  collection: Collection;
  onOpen?: (collectionId: string) => void;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`.trim();
  return `${minutes}m`;
}

/**
 * Card enxuto de coleção: apenas o essencial (título, nº de cursos, duração e
 * progresso). Sem descrição longa nem metadados redundantes — ver
 * `docs/HIERARCHY.md` §5.
 */
export const CollectionCard: React.FC<CollectionCardProps> = ({ collection, onOpen }) => (
  <button
    type="button"
    onClick={onOpen ? () => onOpen(collection.id) : undefined}
    disabled={!onOpen}
    style={styles.card}
  >
    <div style={styles.header}>
      <span style={styles.icon}>
        <Library size={18} color="#A594FF" />
      </span>
      <span style={styles.tags}>{collection.tags.slice(0, 2).join(' · ')}</span>
    </div>

    <h3 style={styles.title}>{collection.title}</h3>

    <div style={styles.progressTrack}>
      <div style={{ ...styles.progressFill, width: `${collection.progress}%` }} />
    </div>

    <div style={styles.footer}>
      <span style={styles.metric}>
        <Clock size={13} />
        {formatDuration(collection.totalDuration)}
      </span>
      <span style={styles.metric}>
        {collection.courseCount} {collection.courseCount === 1 ? 'curso' : 'cursos'}
      </span>
      <span style={styles.percent}>
        {collection.progress > 0 ? `${collection.progress}%` : 'Não iniciado'}
      </span>
    </div>
  </button>
);

const styles: Record<string, React.CSSProperties> = {
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    padding: 18,
    textAlign: 'left',
    width: '100%',
    backgroundColor: '#141A28',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 12,
    cursor: 'pointer',
    color: '#F0F4FC',
    font: 'inherit',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  icon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: 'rgba(165,148,255,0.12)',
  },
  tags: {
    fontSize: 11,
    fontWeight: 600,
    color: '#94A3B8',
    letterSpacing: '0.02em',
  },
  title: {
    fontSize: 15,
    fontWeight: 600,
    lineHeight: 1.35,
    margin: 0,
  },
  progressTrack: {
    width: '100%',
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#A594FF',
    boxShadow: '0 0 8px #A594FF',
    transition: 'width 0.3s ease',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    fontSize: 12,
    color: '#94A3B8',
  },
  metric: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
  },
  percent: {
    marginLeft: 'auto',
    fontWeight: 600,
    color: '#A594FF',
  },
};
