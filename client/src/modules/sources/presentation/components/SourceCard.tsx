import React from 'react';
import { HardDrive } from 'lucide-react';
import type { LibrarySource, SourceStatus } from '@/core/domain/library-source';
import { Spinner } from '@/shared/ui/components/Spinner';
import { SourceNameEditor } from '@/modules/sources/presentation/components/SourceNameEditor';
import { SourceActions } from '@/modules/sources/presentation/components/SourceActions';

const STATUS_META: Record<SourceStatus, { label: string; color: string }> = {
  connected: { label: 'Conectada', color: '#10B981' },
  disconnected: { label: 'Desconectada', color: '#EFC18D' },
  unavailable: { label: 'Indisponível', color: '#F87171' },
  checking: { label: 'Verificando', color: '#A594FF' },
};

export interface SourceCardProps {
  source: LibrarySource;
  onCheck: (id: string) => void;
  onReconnect: (id: string) => void;
  onDisconnect: (id: string) => void;
  onRemove: (id: string) => void;
  onRename: (id: string, name: string) => Promise<void>;
  showDisconnectSimulation?: boolean;
}

function formatLastScan(value: string | null): string {
  if (!value) return 'Nunca analisada';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Nunca analisada';
  return date.toLocaleDateString('pt-BR');
}

export const SourceCard: React.FC<SourceCardProps> = ({
  source,
  onCheck,
  onReconnect,
  onDisconnect,
  onRemove,
  onRename,
  showDisconnectSimulation = true,
}) => {
  const meta = STATUS_META[source.status];
  const isConnected = source.status === 'connected';

  return (
    <article
      data-testid={`source-card-${source.id}`}
      style={{
        backgroundColor: '#131A27',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <HardDrive size={20} color={isConnected ? '#A594FF' : '#EFC18D'} aria-hidden />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              color: '#F0F4FC',
              fontSize: '14px',
              fontWeight: 600,
              overflowWrap: 'anywhere',
            }}
          >
            <SourceNameEditor name={source.name} onSave={(name) => onRename(source.id, name)} />
          </div>
          <div
            style={{
              color: '#64748B',
              fontSize: '12px',
              overflowWrap: 'anywhere',
            }}
          >
            {source.path}
          </div>
        </div>
        <span
          data-testid={`source-status-${source.id}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: meta.color,
            fontSize: '12px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          {source.status === 'checking' && <Spinner size={12} />}
          {meta.label}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '16px', color: '#94A3B8', fontSize: '12px' }}>
        <span>{source.itemCount} conteúdos conhecidos</span>
        <span aria-hidden>·</span>
        <span>Última análise: {formatLastScan(source.lastScannedAt)}</span>
      </div>

      <SourceActions
        source={source}
        showDisconnectSimulation={showDisconnectSimulation}
        onCheck={onCheck}
        onReconnect={onReconnect}
        onDisconnect={onDisconnect}
        onRemove={onRemove}
      />
    </article>
  );
};

SourceCard.displayName = 'SourceCard';
