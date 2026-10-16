import React, { useState } from 'react';
import { HardDrive, RefreshCw, Trash2, PlugZap, Unplug } from 'lucide-react';
import type { LibrarySource, SourceStatus } from '@/core/domain/library-source';
import { Button } from '@/shared/ui/components/Button';
import { Spinner } from '@/shared/ui/components/Spinner';

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
}) => {
  const [confirming, setConfirming] = useState(false);
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
            {source.name}
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

      {confirming ? (
        <div
          role="alert"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <span style={{ color: '#F8FAFC', fontSize: '13px' }}>
            Retirar “{source.name}” do catálogo? Nenhum arquivo físico será excluído.
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              variant="danger"
              size="sm"
              data-testid={`source-confirm-remove-${source.id}`}
              onClick={() => {
                onRemove(source.id);
                setConfirming(false);
              }}
            >
              Confirmar retirada
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onCheck(source.id)}
            disabled={source.status === 'checking'}
          >
            <RefreshCw size={13} style={{ marginRight: '6px' }} aria-hidden />
            Verificar
          </Button>
          {isConnected ? (
            <Button variant="secondary" size="sm" onClick={() => onDisconnect(source.id)}>
              <Unplug size={13} style={{ marginRight: '6px' }} aria-hidden />
              Simular desconexão
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => onReconnect(source.id)}>
              <PlugZap size={13} style={{ marginRight: '6px' }} aria-hidden />
              Reconectar
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Retirar fonte ${source.name}`}
            onClick={() => setConfirming(true)}
          >
            <Trash2 size={13} style={{ marginRight: '6px' }} aria-hidden />
            Retirar
          </Button>
        </div>
      )}
    </article>
  );
};

SourceCard.displayName = 'SourceCard';
