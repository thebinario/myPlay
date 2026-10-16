import React from 'react';
import { ArrowRight, HardDrive } from 'lucide-react';
import type { LibrarySource } from '@/core/domain/library-source';

const STATUS_LABELS = {
  connected: 'Conectada',
  disconnected: 'Desconectada',
  unavailable: 'Indisponível',
  checking: 'Verificando',
} as const;

interface LibrarySourceCardProps {
  source: LibrarySource;
  onOpen: (sourceId: string) => void;
}

export const LibrarySourceCard: React.FC<LibrarySourceCardProps> = ({ source, onOpen }) => (
  <button
    type="button"
    aria-label={`Abrir biblioteca ${source.name}`}
    onClick={() => onOpen(source.id)}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      width: '100%',
      minHeight: '116px',
      padding: '20px',
      color: '#F0F4FC',
      textAlign: 'left',
      backgroundColor: '#141A28',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '12px',
      cursor: 'pointer',
    }}
  >
    <HardDrive size={28} color="#A594FF" aria-hidden />
    <span style={{ display: 'flex', flex: 1, flexDirection: 'column', gap: '6px', minWidth: 0 }}>
      <strong style={{ fontSize: '16px' }}>{source.name}</strong>
      <span style={{ color: '#64748B', fontSize: '13px', overflowWrap: 'anywhere' }}>
        {source.path}
      </span>
      <span style={{ color: '#94A3B8', fontSize: '13px' }}>
        {source.libraryType === 'movie' ? 'Filmes' : 'Cursos'} · {source.itemCount} conteúdos ·{' '}
        {STATUS_LABELS[source.status]}
      </span>
    </span>
    <ArrowRight size={20} color="#94A3B8" aria-hidden />
  </button>
);

LibrarySourceCard.displayName = 'LibrarySourceCard';
